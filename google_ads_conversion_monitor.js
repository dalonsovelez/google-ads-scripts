/**
 * @name Critical Conversion Drop Alert (MCC Multi-Brand)
 * @version 1.1
 * @author Daniel Alonso | Global Head of Data & AdTech @ Omnicom Media
 * @copyright 2025 Daniel Alonso
 * @description 
 * Monitors conversion volume across a global MCC ecosystem (SEAT, CUPRA, Škoda).
 * Compares current performance (last X days) against a historical baseline 
 * to detect technical anomalies or tracking failures in Floodlight tags.
 */

// =======================================================
// 1. CONFIGURATION BLOCK
// =======================================================

// Team aliases for consolidated alert delivery
var NOTIFICATION_EMAILS = "alert-recipient@example.com"; 

// Analysis Sensitivity
var DROP_PERCENTAGE_THRESHOLD = 0.9; // Triggers at 90% drop
var MIN_AVG_VOLUME_REQUIRED = 10;     // Minimum baseline volume to avoid false positives

// Timeframe Definition
var ANALYSIS_DAYS = 2;               // Window for recent anomaly detection
var REFERENCE_DAYS = 14;             // Historical baseline for comparison

// Global AdTech Taxonomy Mapping
var CONVERSION_GROUPS = {
    'Page_Visits': ['Page-Visit', 'Page-VisitUser', 'AllPage', 'VisitMainPage'], 
    'Engagement_120sec': ['120sec', 'Page-Visit120s', 'Visit120s'], 
    'Brochure_Download': ['Download-Brochure'],
    'Configurator_Complete': ['Configuration-Complete', 'Car-Configurator-Complete', 'Configuration-Steps'],
    'Lead_Form_Submission': ['Form-Submission', 'Contact-Me', 'Test-Drive-Request-Complete'],
    'Dealer_Locator_Search': ['Locate-a-Dealer', 'StockLocator']
};

// Market Filtering Logic
var BRAND_PREFIXES = ['SEAT', 'CUPRA', 'SKODA'];
var GLOBAL_MARKETS = ['DE', 'MX', 'FR', 'ES', 'PT', 'UK', 'AT', 'IT', 'PL', 'BE', 'NL'];

// =======================================================
// 2. MAIN EXECUTION FLOW
// =======================================================

function main() {
  var generatedAlerts = [];
  var processedBrands = new Set();
  var accountIterator = MccApp.accounts().get();
  var mccName = AdsApp.currentAccount().getName();

  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    var accountName = account.getName().toUpperCase();
    var detectedBrand = '';
    
    // Brand validation via prefix matching
    var shouldInclude = BRAND_PREFIXES.some(function(prefix) {
        if (accountName.indexOf(prefix.toUpperCase()) !== -1) {
          detectedBrand = prefix.toUpperCase();
          return true;
        }
        return false;
    });
    
    if (!shouldInclude || detectedBrand === '') continue; 
    
    MccApp.select(account); 
    Logger.log("Analyzing Global Account: " + account.getName() + " [" + account.getCustomerId() + "]");

    try {
      // Market code extraction (Assumes BRAND XX naming convention)
      var countryMatch = accountName.match(/(SEAT|CUPRA|SKODA)\s+([A-Z]{2})/);
      var countryCode = countryMatch && countryMatch[2] ? countryMatch[2] : 'INTL';
      
      processedBrands.add(detectedBrand);

      var detectedDrops = analyzeConversionActions(
          DROP_PERCENTAGE_THRESHOLD, 
          MIN_AVG_VOLUME_REQUIRED, 
          REFERENCE_DAYS, 
          ANALYSIS_DAYS, 
          CONVERSION_GROUPS, 
          countryCode, 
          detectedBrand
      );
      
      if (detectedDrops.length > 0) {
        generatedAlerts.push({
          accountName: account.getName(),
          countryCode: countryCode,
          brand: detectedBrand,
          accountId: account.getCustomerId(),
          alerts: detectedDrops
        });
      }
    } catch (e) {
      Logger.log("Critical Error in Account " + account.getName() + ": " + e);
    }
  }

  if (generatedAlerts.length > 0) {
    sendConsolidatedAlert(NOTIFICATION_EMAILS, generatedAlerts, REFERENCE_DAYS, ANALYSIS_DAYS, DROP_PERCENTAGE_THRESHOLD, mccName);
  } else {
    Logger.log("Audit Complete: No critical anomalies detected across global accounts.");
  }
}

// =======================================================
// 3. CORE ANALYTICS FUNCTIONS
// =======================================================

function isFloodlightRelevant(floodlightName, countryCode, brand) {
    var nameUpper = floodlightName.toUpperCase();
    var countryUpper = countryCode.toUpperCase();
    var brandUpper = brand.toUpperCase();
    
    // Taxonomy check: Tag must contain brand and market code
    if (nameUpper.indexOf(brandUpper) === -1) return false;

    var marketCodes = [countryUpper];
    if (countryUpper === 'UK') marketCodes.push('GB');
    if (countryUpper === 'GB') marketCodes.push('UK');

    return marketCodes.some(function(c) {
        return nameUpper.indexOf(c) !== -1;
    });
}

function analyzeConversionActions(threshold, minVol, daysRef, daysAnal, groups, country, brand) {
  var drops = [];
  var groupedData = {};

  var endAnal = getFormattedDate(-1); 
  var startAnal = getFormattedDate(-daysAnal); 
  var endRef = getFormattedDate(-(daysAnal + 1));
  var startRef = getFormattedDate(-(daysRef + daysAnal));

  // GAQL Querying for Baseline vs Current
  var queryAnal = 'SELECT conversion_action.name, metrics.all_conversions ' +
                  'FROM conversion_action ' +
                  'WHERE segments.date >= "' + startAnal + '" AND segments.date <= "' + endAnal + '" ';
  processReport(AdsApp.report(queryAnal), groupedData, groups, 'ANALYSIS');

  var queryRef = 'SELECT conversion_action.name, metrics.all_conversions ' +
                 'FROM conversion_action ' +
                 'WHERE segments.date >= "' + startRef + '" AND segments.date <= "' + endRef + '" ';
  processReport(AdsApp.report(queryRef), groupedData, groups, 'REFERENCE');

  for (var groupName in groupedData) {
    var data = groupedData[groupName];
    var avgRef = data.totalReference / daysRef; 
    var avgAnal = data.totalAnalysis / daysAnal;
    
    if (avgRef >= minVol) { 
      var change = (avgAnal - avgRef) / avgRef;
      if (change < -threshold) {
        var relevantDetails = filterDropDetails(data.details, daysRef, daysAnal, threshold, country, brand);
        if (relevantDetails.length > 0) {
          drops.push({
            group: groupName, 
            change: change,
            avgRef: avgRef, 
            avgAnal: avgAnal, 
            details: relevantDetails
          });
        }
      }
    }
  }
  return drops;
}

function processReport(report, groupedData, groups, period) {
  var rows = report.rows();
  while (rows.hasNext()) {
    var row = rows.next();
    var name = row['conversion_action.name']; 
    var convs = parseFloat(row['metrics.all_conversions'] || 0);

    if (isNaN(convs) || !name || convs === 0) continue;

    var targetGroup = null;
    for (var g in groups) {
        if (groups[g].some(function(k) { return name.toLowerCase().indexOf(k.toLowerCase()) !== -1; })) {
            targetGroup = g; break; 
        }
    }

    if (!targetGroup) continue;
    if (!groupedData[targetGroup]) { 
      groupedData[targetGroup] = { totalReference: 0, totalAnalysis: 0, details: [] };
    }

    if (period === 'ANALYSIS') {
      groupedData[targetGroup].totalAnalysis += convs;
    } else {
      groupedData[targetGroup].totalReference += convs; 
    }
    groupedData[targetGroup].details.push({ name: name, value: convs, period: period });
  }
}

function filterDropDetails(details, daysRef, daysAnal, threshold, country, brand) {
    var mapping = {};
    details.forEach(function(d) {
        if (!mapping[d.name]) mapping[d.name] = { ref: 0, anal: 0 };
        if (d.period === 'ANALYSIS') mapping[d.name].anal += d.value;
        else mapping[d.name].ref += d.value;
    });

    var results = [];
    for (var name in mapping) {
        var avgR = mapping[name].ref / daysRef;
        var avgA = mapping[name].anal / daysAnal;
        if (avgR >= 0.1) {
            var chg = (avgA - avgR) / avgR;
            if (chg < -threshold && isFloodlightRelevante(name, country, brand)) {
                results.push({ name: name, change: chg, avgAnal: avgA, avgRef: avgR });
            }
        }
    }
    return results;
}

// =======================================================
// 4. UTILITIES & ALERTS
// =======================================================

function getFormattedDate(offset) {
  var date = new Date();
  date.setDate(date.getDate() + offset);
  return Utilities.formatDate(date, "UTC", "yyyy-MM-dd");
}

function sendConsolidatedAlert(email, alerts, daysRef, daysAnal, threshold, mccName) {
  var subject = "🚨 CRITICAL ADTECH ALERT: Conversion Monitoring Framework [" + mccName + "]";
  var body = "Global Data Governance Report: Conversion Drop Detected\n" +
             "Threshold: > " + (threshold * 100).toFixed(0) + "% | MCC: " + mccName + "\n\n" +
             "Analysis Parameters:\n" +
             "- Reference Baseline: " + daysRef + " days\n" +
             "- Analysis Window: " + daysAnal + " day(s)\n\n" +
             "==================================================\n" +
             "AFFECTED GLOBAL ACCOUNTS\n" +
             "==================================================\n";

  alerts.forEach(function(a) {
    body += "\nACCOUNT: " + a.accountName + " [" + a.countryCode + "]\n";
    a.alerts.forEach(function(drop) {
      body += "Action Group: " + drop.group + " | Change: " + (drop.change * 100).toFixed(1) + "%\n";
      body += "Baseline Avg: " + drop.avgRef.toFixed(1) + " | Current Avg: " + drop.avgAnal.toFixed(1) + "\n";
    });
    body += "--------------------------------------------------\n";
  });

  MailApp.sendEmail(email, subject, body);
}

// Backwards compatibility helper
function isFloodlightRelevante(n, c, b) { return isFloodlightRelevant(n, c, b); }