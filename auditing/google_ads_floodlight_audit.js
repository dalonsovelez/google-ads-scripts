/**
 * @name Floodlight Zero Conversion Audit (Global MCC)
 * @version 1.1
 * @author Daniel Alonso | Global Head of Data & AdTech @ Omnicom Media
 * @copyright 2025 Daniel Alonso
 * @description 
 * Identifies inactive conversion actions across a global MCC ecosystem. 
 * Used for technical QA, implementation auditing, and legacy tag decommissioning.
 */

// =======================================================
// 1. CONFIGURATION BLOCK
// =======================================================

var RECIPIENT_EMAIL = "your-reporting-alias@example.com";

// Audit Timeframe
var START_DATE_ANALYSIS = '2025-01-01';
var END_DATE_ANALYSIS = '2025-12-31';

var BRAND_PREFIXES = ['BRAND_A', 'BRAND_B', 'BRAND_C'];
var GLOBAL_MARKETS = ['DE', 'MX', 'FR', 'ES', 'PT', 'UK', 'IT', 'PL', 'AT', 'AU'];

// =======================================================
// 2. MAIN EXECUTION
// =======================================================

function main() {
    var zeroActivityList = [];
    var accountIterator = MccApp.accounts().get();
    var mccName = AdsApp.currentAccount().getName();

    while (accountIterator.hasNext()) {
        var account = accountIterator.next();
        var accountName = account.getName().toUpperCase();
        var detectedBrand = '';

        var shouldInclude = BRAND_PREFIXES.some(function(prefix) {
            if (accountName.indexOf(prefix.toUpperCase()) !== -1) {
                detectedBrand = prefix.toUpperCase();
                return true;
            }
            return false;
        });

        if (!shouldInclude || detectedBrand === '') continue;

        MccApp.select(account);
        Logger.log("Auditing: " + account.getName());

        try {
            var countryMatch = accountName.match(/(BRAND_A|BRAND_B|BRAND_C)\s+([A-Z]{2})/);
            var countryCode = countryMatch && countryMatch[2] ? countryMatch[2] : 'INTL';

            var inactiveTags = listZeroConversionFloodlights(
                START_DATE_ANALYSIS, 
                END_DATE_ANALYSIS, 
                countryCode, 
                detectedBrand
            );

            if (inactiveTags.length > 0) {
                zeroActivityList.push({
                    accountName: account.getName(),
                    countryCode: countryCode,
                    brand: detectedBrand,
                    accountId: account.getCustomerId(),
                    floodlights: inactiveTags
                });
            }
        } catch (e) {
            Logger.log("Error auditing account " + account.getName() + ": " + e);
        }
    }

    sendAuditEmail(RECIPIENT_EMAIL, zeroActivityList, mccName, START_DATE_ANALYSIS, END_DATE_ANALYSIS);
}

// =======================================================
// 3. AUDIT LOGIC
// =======================================================

function listZeroConversionFloodlights(startDate, endDate, countryCode, brand) {
    var zeroFloodlights = [];
    var query = 'SELECT conversion_action.name ' +
                'FROM conversion_action ' +
                'WHERE segments.date >= "' + startDate + '" ' +
                'AND segments.date <= "' + endDate + '" ' +
                'AND metrics.all_conversions = 0';

    var report = AdsApp.report(query);
    var rows = report.rows();
    var processed = new Set();

    while (rows.hasNext()) {
        var row = rows.next();
        var name = row['conversion_action.name'];
        
        if (name && !processed.has(name)) {
            if (isFloodlightRelevant(name, countryCode, brand)) {
                zeroFloodlights.push(name);
                processed.add(name);
            }
        }
    }
    return zeroFloodlights.sort();
}

function isFloodlightRelevant(name, countryCode, brand) {
    var n = name.toUpperCase();
    var c = countryCode.toUpperCase();
    var b = brand.toUpperCase();
    
    // Heuristic 1: Brand relevance
    if (n.indexOf(b) === -1) return false;

    // Heuristic 2: Market exclusion (Prevent cross-market false positives)
    var marketCodes = [c];
    if (c === 'UK') marketCodes.push('GB');
    
    var disallowed = GLOBAL_MARKETS.filter(function(code) { return marketCodes.indexOf(code) === -1; });
    var regexOther = new RegExp('(^|[\\s\\-_])(' + disallowed.join('|') + ')([\\s\\-_]|$)', 'g');
    
    if (regexOther.test(n)) return false;

    return true;
}

// =======================================================
// 4. REPORTING
// =======================================================

function sendAuditEmail(email, list, mcc, start, end) {
    var subject = "📄 Data Hygiene Audit: Zero Conversion Report [" + mcc + "]";
    var body = "Automated Audit Report: **" + mcc + "**\n\n" +
               "The following tags registered ZERO activity between " + start + " and " + end + ".\n" +
               "Action required: Review implementation or decommission legacy tags.\n\n";
    
    list.forEach(function(acc) {
        body += "\n[" + acc.countryCode + "] " + acc.accountName + "\n";
        acc.floodlights.forEach(function(f) { body += " • " + f + "\n"; });
    });

    MailApp.sendEmail(email, subject, body);
}