/**
 * ECW Appointment Search - Public Version
 *
 * INPUT: Set window.SEARCH_PARAMS before running
 * OUTPUT: Results copied to clipboard as JSON
 *
 * Example Usage:
 * window.SEARCH_PARAMS = {
 *   // Required
 *   providers: [123456, 789012],      // Provider IDs
 *   visitType: "VISIT_TYPE_CODE",
 *
 *   // Optional
 *   facility: "0",                    // "0" = all, or specific facility ID
 *   reason: "",                       // Reason text
 *   specialty: "",                    // Specialty
 *   gender: "",                       // Gender filter
 *   language: "",                     // Language filter
 *   showOnlyResidents: false,         // Show only residents
 *   acceptingNewPatient: false,       // Accepting new patients only
 *   startDate: "",                    // MM/DD/YYYY or empty
 *   startTime: "",                    // HH:MM:SS or empty
 *   endTime: "",                      // HH:MM:SS or empty
 *   dayPref: "",                      // "1,2,3,4,5,6,7" or empty (1=Sun, 7=Sat)
 *   duration: 15,                     // Appointment duration (minutes)
 *   nextApptAfter: 0,                 // Next appt after (minutes)
 *   startAtSameTime: false,           // Start at same time
 *   excludeBookedSlots: true,
 *   excludeBlockedSlots: true,
 *   resultSize: 100
 * };
 */

(async function() {
    console.log('🚀 ECW Search Starting...');

    // Get params from window
    if (!window.SEARCH_PARAMS) {
        console.error('❌ Error: window.SEARCH_PARAMS not defined');
        console.log('Set window.SEARCH_PARAMS before running this script.');
        console.log('Example: window.SEARCH_PARAMS = {providers: [123456], visitType: "VISIT_TYPE"};');
        return;
    }

    const params = window.SEARCH_PARAMS;

    // Validate required params
    if (!params.providers || !Array.isArray(params.providers) || params.providers.length === 0) {
        console.error('❌ Error: providers is required and must be a non-empty array');
        return;
    }

    if (!params.visitType) {
        console.error('❌ Error: visitType is required');
        return;
    }

    console.log('Parameters:', params);

    // Normalize providers - accept numbers or objects
    const normalizedProviders = params.providers.map(p => {
        if (typeof p === 'number') {
            return {provider: p, vrule: 0, providerName: ''};
        } else {
            return {
                provider: p.id,
                vrule: p.vrule !== undefined ? p.vrule : 0,
                providerName: p.name || ''
            };
        }
    });

    // Build criteria with all available fields
    const criteria = [{
        vt: params.visitType,
        facility: params.facility || '0',
        visitStartDate: params.startDate || '',
        visitStartTime: params.startTime || '',
        visitEndTime: params.endTime || '',
        waitTime: params.nextApptAfter || '0',
        sameTimeAppt: params.startAtSameTime ? '1' : '0',
        reason: params.reason || '',
        specialty: params.specialty || '',
        gender: params.gender || '',
        language: params.language || '',
        showOnlyResidents: params.showOnlyResidents ? '1' : '0',
        acceptingNewPatient: params.acceptingNewPatient ? '1' : '0',
        providerandvrule: normalizedProviders
    }];

    // Build form data
    const formData = new URLSearchParams({
        criteria: JSON.stringify(criteria),
        startDate: params.startDate || '',
        startTimefrm: params.startTime || '',
        endTimefrm: params.endTime || '',
        nSchDuration: String(params.duration || 15),
        dayPref: params.dayPref || '',
        excludeBookedSlots: params.excludeBookedSlots !== false ? '1' : '0',
        excludeBlockedSlots: params.excludeBlockedSlots !== false ? '1' : '0'
    });

    // Get CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ||
                     document.querySelector('[name="X-CSRF-Token"]')?.content;

    // Make request
    const url = `${window.location.origin}/mobiledoc/Controller?action=searchappt&project=WebEMR&resultSize=${params.resultSize || 100}`;

    console.log('Sending request...');

    const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    resolve(JSON.parse(xhr.responseText));
                } catch (e) {
                    reject(e);
                }
            } else {
                reject(new Error(`HTTP ${xhr.status}`));
            }
        };

        xhr.onerror = () => reject(new Error('Network error'));

        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        xhr.setRequestHeader('Accept', 'application/json, text/plain, */*');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('isajaxrequest', 'true');
        if (csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken);

        xhr.send(formData.toString());
    });

    // Flatten results
    const slots = [];
    for (const group of response) {
        if (group.results && Array.isArray(group.results)) {
            for (const slot of group.results) {
                slots.push({
                    date: slot.date,
                    time: slot.startTime,
                    datetime: slot.datetime,
                    provider: slot.providerName,
                    providerId: slot.providerId,
                    facility: slot.facilityName,
                    facilityId: slot.facilityId,
                    visitType: slot.visitType,
                    duration: group.duration || slot.slotduration
                });
            }
        }
    }

    console.log(`✅ Found ${slots.length} slots`);
    console.table(slots.slice(0, 5));

    // Store results as JSON string in window
    const jsonOutput = JSON.stringify(slots, null, 2);
    window.ECW_RESULTS_JSON = jsonOutput;
    window.ECW_RESULTS = slots;

    console.log('✅ Results ready!');
    console.log(`Total: ${slots.length} slots`);

    // Copy to clipboard using textarea method (most reliable)
    try {
        const textarea = document.createElement('textarea');
        textarea.value = jsonOutput;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        console.log('✅ Results copied to clipboard!');
    } catch (e) {
        console.log('⚠️ Clipboard copy failed:', e.message);
    }

    console.log('📋 Access results: window.ECW_RESULTS_JSON');

    return jsonOutput;
})();
