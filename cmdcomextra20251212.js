// CureMD Combined Patient Data Extractor
// Run this on Patient Search page - it will find patient, open details, and extract data
(function() {
    console.log("=== CureMD Combined Patient Data Extractor ===");
    console.log("Step 1: Searching for patient data...\n");

    // Function to extract patients from a document
    function extractPatientsFromDocument(doc) {
        const patientLinks = doc.querySelectorAll('a[id^="anchorPatientName"]');
        if (!patientLinks || patientLinks.length === 0) {
            return null;
        }

        const patients = [];
        patientLinks.forEach((patientLink, index) => {
            try {
                const hrefMatch = patientLink.getAttribute('href').match(/LoadPatient\((\d+),/);
                const hiddenPatientId = hrefMatch ? hrefMatch[1] : null;

                if (!hiddenPatientId) {
                    console.warn(`Skipping patient ${index + 1}: Could not extract ID`);
                    return;
                }

                const idSuffix = patientLink.id.replace('anchorPatientName', '');
                const patientName = patientLink.textContent.trim();
                const accountNumber = doc.getElementById(`spanPatientAccount${idSuffix}`)?.textContent.trim();
                const ssn = doc.getElementById(`spanPatientSSN${idSuffix}`)?.textContent.trim();
                const phone = doc.getElementById(`spanPatientPhone${idSuffix}`)?.textContent.trim();
                const dob = doc.getElementById(`spanPatientDOB${idSuffix}`)?.textContent.trim();
                const chart = doc.getElementById(`spanPatientLocationOrChart${idSuffix}`)?.textContent.trim();
                const patientBalance = doc.getElementById(`spanPatientBalance${idSuffix}`)?.textContent.trim();
                const planBalance = doc.getElementById(`spanPatientPlan${idSuffix}`)?.textContent.trim();

                patients.push({
                    index: index + 1,
                    hiddenPatientId,
                    accountNumber,
                    patientName,
                    ssn,
                    phone,
                    dob,
                    chart,
                    patientBalance,
                    planBalance
                });

            } catch(e) {
                console.error(`Error processing patient ${index + 1}:`, e);
            }
        });

        return patients.length > 0 ? patients : null;
    }

    // Function to extract full patient demographics
    function extractPatientDetails(doc) {
        console.log("\n=== Step 2: Extracting Patient Details ===\n");

        const demographicData = {
            patientInfo: {},
            addresses: {},
            contactInfo: {},
            insurance: {},
            demographics: {},
            providers: {},
            emergencyContact: {},
            employment: {},
            clinicalInfo: {},
            previousNames: {},
            mothersMaiden: {},
            commonWell: {},
            supportContact: {}
        };

        function getValue(id) {
            const element = doc.getElementById(id);
            if (!element) return null;

            if (element.tagName === 'SELECT') {
                return element.options[element.selectedIndex]?.text || '';
            } else if (element.type === 'checkbox') {
                return element.checked;
            } else if (element.type === 'radio') {
                const name = element.name;
                const checked = doc.querySelector(`input[name="${name}"]:checked`);
                return checked ? checked.value : null;
            }
            return element.value || '';
        }

        function getValueByLabel(labelText) {
            const labels = Array.from(doc.querySelectorAll('label, td'));
            const label = labels.find(l => l.textContent.trim().includes(labelText));
            if (label) {
                const input = label.nextElementSibling?.querySelector('input, select, textarea') ||
                             label.parentElement?.querySelector('input, select, textarea');
                if (input) {
                    if (input.tagName === 'SELECT') {
                        return input.options[input.selectedIndex]?.text || '';
                    }
                    return input.value || '';
                }
            }
            return null;
        }

        function extractAllInputs() {
            const inputs = {};
            doc.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"], select, textarea').forEach(el => {
                if (el.id && el.value) {
                    inputs[el.id] = el.value;
                }
            });
            return inputs;
        }

        // Extract all sections
        try {
            demographicData.patientInfo = {
                patientId: getValue('intPatient_ID'),
                accountNumber: getValue('TxtVAcc'),
                chartNumber: getValue('txtChartNo') || getValueByLabel('Chart No.'),
                title: getValue('cmbVTitle') || getValue('cmbTitle'),
                firstName: getValue('txtVFNAME'),
                middleName: getValue('txtVMNAME'),
                lastName: getValue('txtVLNAME'),
                suffix: getValue('cmbSuffix') || getValue('cmbSupportSuffix'),
                preferredName: getValue('txtVPREFNAME'),
                pronoun: getValue('cmbPronoun'),
                dateOfBirth: getValue('txtDDOB'),
                age: getValue('txtAge') || getValue('patAgeSupportContact'),
                ssn: getValue('txtVSSN'),
                gender: getValue('cmbVSEX') || getValue('cmbSEX'),
                genderIdentity: getValue('cmbGenderIdentity'),
                sexualOrientation: getValue('cmbSexualOrientation'),
                maritalStatus: getValue('cmbvstatus') || getValue('cmbMaritalStatus') || getValue('cmbVSTATUS'),
            };

            demographicData.addresses = {
                current: {
                    address1: getValue('txtvaddress1') || getValue('txtVAddress1'),
                    address2: getValue('txtvaddress2') || getValue('txtVAddress2'),
                    city: getValue('txtvcity') || getValue('txtVCity'),
                    state: getValue('txtVSTATE') || getValue('cmbState'),
                    zip: getValue('txtVZIP') || getValue('SelectZipPatient') || getValue('txtZip'),
                    county: getValue('txtVCounty'),
                    country: getValue('ddlCountry') || getValue('cmbCountry')
                },
                alternate: {
                    sameAsAbove: getValue('chkMailingAddress') || getValue('chkSameAsAbove'),
                    address1: getValue('txtMailingAddress1') || getValue('txtAlternateAddress1'),
                    address2: getValue('txtMailingAddress2') || getValue('txtAlternateAddress2'),
                    city: getValue('txtMailingCity') || getValue('txtAlternateCity'),
                    state: getValue('cmbMailingState') || getValue('cmbAlternateState'),
                    zip: getValue('txtMailingZipCode') || getValue('txtAlternateZip'),
                    county: getValue('txtMailingCounty') || getValue('txtAlternateCounty'),
                    country: getValue('ddlPrtCountry') || getValue('cmbMailingCountry') || getValue('cmbAlternateCountry')
                }
            };

            const mobilePhone = getValue('txtVPHONE') || getValue('txtCPhone') || getValue('txtMobile');
            const phoneType = getValue('cmbPhoneTypes') || getValue('cmbPhoneTypesX');

            demographicData.contactInfo = {
                mobile: mobilePhone,
                phoneType: phoneType,
                homePhone: getValue('txtVHPHONE'),
                workPhone: getValue('txtVWPHONE'),
                email: getValue('txtVEmail'),
                preferredContactMethod: getValue('cmbPreferredContact'),
                textViaEmail: getValue('txtTextViaEmail'),
                otherContacts: getValue('txtOtherContacts') || getValue('Txt_1_0')
            };

            demographicData.providers = {
                location: getValue('cmbILOCID'),
                primaryProvider: getValue('PrimaryCareText') || getValue('TxtRefPRVName'),
                primaryCarePhone: getValue('PrimaryCarePhone'),
                primaryCareSpecialty: getValue('cmbSpecprimary'),
                referringProvider: getValue('txtReferringProvider') || getValue('cmbIPRVID'),
                billingProvider: getValue('cmbBilling_Provider'),
                renderingProvider: getValue('cmbIPRVID'),
                referralSource: getValue('cmbFindUS') || getValue('cmbReferralSource'),
                sourceDetails: getValue('txtSourceDetails'),
                agency: getValue('cmbAgency')
            };

            demographicData.demographics = {
                race: getValue('txtRace_txtField') || getValue('ctrltxtRace') || getValue('hdnRaceName'),
                ethnicity: getValue('ddlEthnicity') || getValue('cmbEthnicity'),
                language: getValue('txtLanguage_txtField') || getValue('ctrltxtLanguage') || getValue('hdnMultipleLanguages'),
                limitedEnglishProficiency: getValue('chkLimitedEnglish'),
                religion: getValue('ddlReligion') || getValue('cmbReligion'),
                education: getValue('ddlEducation')
            };

            demographicData.employment = {
                workStatus: getValue('cmbVWSTATUS') || getValue('cmbEmploymentStatus') || getValue('cmbWorkStatus'),
                employer: getValue('txtEmployer'),
                occupation: getValue('txtOccupation'),
                studentStatus: getValue('cmbStudentStatus')
            };

            demographicData.insurance = {
                primary: {
                    insuranceName: getValue('txtPInsuranceName'),
                    policyNumber: getValue('txtVIDNum'),
                    groupNumber: getValue('txtVGroupNum'),
                    subscriberId: getValue('txtPSubscriberId'),
                    relationToInsured: getValue('cmbRelationship'),
                    planId: getValue('hdniPlanId')
                },
                secondary: {
                    insuranceName: getValue('txtSInsuranceName'),
                    policyNumber: getValue('txtSecVIDNUM'),
                    groupNumber: getValue('txtSecVGroupNum'),
                    subscriberId: getValue('txtSSubscriberId'),
                    relationToInsured: getValue('cmbSecRelationship')
                }
            };

            demographicData.emergencyContact = {
                name: getValue('txtEmergencyContactName'),
                relationship: getValue('cmbEmergencyRelationship'),
                phone: getValue('txtEmergencyPhone'),
                address: getValue('txtEmergencyAddress')
            };

            demographicData.clinicalInfo = {
                isDeceased: getValue('chkDeceased'),
                deceasedDate: getValue('txtDeceasedDate'),
                isVIP: getValue('chkVIP'),
                isTestPatient: getValue('hdnIsTestPatient'),
                comments: getValue('txtVComments'),
                isDaiseyEnrolled: doc.getElementById('lnkDaisey')?.textContent.includes('Enrolled')
            };

            demographicData.previousNames = {
                firstName: getValueByLabel('Previous') || getValue('txtPreviousFirstName'),
                lastName: getValue('txtPreviousLastName')
            };

            demographicData.mothersMaiden = {
                firstName: getValue('txtMotherFirstName'),
                lastName: getValue('txtMotherLastName')
            };

            demographicData.commonWell = {
                enabled: getValue('toggleCommonWellHeaderButton') || getValue('patientToggleCheckbox'),
                consentId: getValue('hdnConsentID'),
                isPersonFlowCompleted: getValue('hdnCWPersonFlowCompleted'),
                isBackloadSent: getValue('isCommonWellBackloadSent')
            };

            demographicData.supportContact = {
                isRequired: getValue('isMdnSupportContact') === '1',
                title: getValue('cmbSupportTitle'),
                suffix: getValue('cmbSupportSuffix'),
                isTitleType: getValue('isTitleSupportContact')
            };

        } catch(e) {
            console.error("Error extracting demographics:", e);
        }

        const allInputs = extractAllInputs();
        let searchContext = null;
        try {
            const storedPatient = sessionStorage.getItem('curemd_current_patient');
            if (storedPatient) {
                searchContext = JSON.parse(storedPatient);
            }
        } catch(e) {}

        const result = {
            extractedData: demographicData,
            rawInputs: allInputs,
            searchContext: searchContext,
            metadata: {
                extractedAt: new Date().toISOString(),
                patientId: getValue('intPatient_ID'),
                accountNumber: getValue('TxtVAcc'),
                pageUrl: doc.location ? doc.location.href : window.location.href
            }
        };

        return result;
    }

    // Check if we're on patient details page
    const isDetailsPage = window.location.href.includes('datPatient.aspx');

    if (isDetailsPage) {
        // We're on the details page, extract data
        const result = extractPatientDetails(document);

        console.log("=== ENHANCED PATIENT DEMOGRAPHIC DATA ===");
        console.log(JSON.stringify(result, null, 2));

        // Copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(JSON.stringify(result, null, 2))
                .then(() => console.log("\n✓ Data copied to clipboard!"))
                .catch(err => console.log("\nCould not copy to clipboard:", err));
        }

        // Download as JSON file
        const patientId = result.metadata.patientId || result.metadata.accountNumber || 'unknown';
        const patientName = `${result.extractedData.patientInfo.firstName || ''}_${result.extractedData.patientInfo.lastName || ''}`.replace(/\s+/g, '_');
        const filename = `patient_demographics_${patientName}_${patientId}.json`;

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", filename);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        console.log(`\n✓ JSON file downloaded: ${filename}`);
        console.log("\n📊 Summary:");
        console.log(`- Patient: ${result.extractedData.patientInfo.firstName} ${result.extractedData.patientInfo.lastName}`);
        console.log(`- Patient ID: ${result.extractedData.patientInfo.patientId}`);
        console.log(`- Account #: ${result.extractedData.patientInfo.accountNumber}`);
        console.log(`- DOB: ${result.extractedData.patientInfo.dateOfBirth}`);
        console.log(`- Location: ${result.extractedData.providers.location}`);

        if (result.searchContext) {
            console.log(`\n✓ Linked to search context:`);
            console.log(`  - Hidden ID: ${result.searchContext.hiddenPatientId}`);
            console.log(`  - Account #: ${result.searchContext.accountNumber}`);
        }

        return result;
    }

    // We're on search page - find patient and navigate
    let patients = extractPatientsFromDocument(document);
    let foundLocation = "current page";

    if (!patients) {
        console.log("Not found in main document, searching iframes...");
        const iframes = document.querySelectorAll('iframe');

        for (let i = 0; i < iframes.length; i++) {
            try {
                const iframe = iframes[i];
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                patients = extractPatientsFromDocument(iframeDoc);

                if (patients) {
                    foundLocation = `iframe "${iframe.id || iframe.name || 'unnamed'}"`;
                    console.log(`✓ Found patients in ${foundLocation}`);
                    break;
                }
            } catch(e) {
                // Can't access iframe, skip
            }
        }
    }

    if (!patients) {
        console.error("❌ Error: Could not find any patient results.");
        console.log("Make sure you're on the Patient Search results page with results displayed.");
        console.log("\nTip: Perform a search first to see patient results, then run this script.");
        return;
    }

    console.log(`Found ${patients.length} patient(s) in ${foundLocation}:\n`);

    patients.forEach(p => {
        console.log(`${p.index}. ${p.patientName}`);
        console.log(`   Hidden ID: ${p.hiddenPatientId}`);
        console.log(`   Account #: ${p.accountNumber}`);
        console.log(`   DOB: ${p.dob}`);
        console.log(`   Phone: ${p.phone}`);
        console.log('');
    });

    if (patients.length === 1) {
        const patient = patients[0];
        const detailsUrl = `https://app4.curemd.net/curemdc/Patient/datPatient.aspx?intPatient_ID=${patient.hiddenPatientId}&PatientId=${patient.hiddenPatientId}`;

        console.log(`✓ Patient found: ${patient.patientName}`);
        console.log(`  Hidden ID: ${patient.hiddenPatientId}`);
        console.log(`  Account #: ${patient.accountNumber}`);
        console.log(`  URL: ${detailsUrl}\n`);
        console.log("📌 Opening patient details page...");
        console.log("⏳ Once loaded, run this same script again to extract full data.");

        sessionStorage.setItem('curemd_current_patient', JSON.stringify(patient));

        const newWindow = window.top.open(detailsUrl, '_blank');

        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            console.log("\n⚠️  Pop-up blocked. Copy this URL and open manually:");
            console.log(detailsUrl);
            console.log("\nThen run this script again on that page.");
        } else {
            console.log("\n✓ New tab opened! Run this script on that page to extract data.");
        }

        window.openPatient = function(index) {
            if (index !== 1) {
                console.error(`❌ Invalid index. Only 1 patient found.`);
                return;
            }
            sessionStorage.setItem('curemd_current_patient', JSON.stringify(patient));
            window.top.open(detailsUrl, '_blank');
            return patient;
        };

        return patient;
    }

    // Multiple patients
    console.log("📋 Multiple patients found. To open a specific patient, use:");
    console.log("   openPatient(index)  // e.g., openPatient(1)\n");
    console.log("Then run this script again on the patient details page.");

    window.openPatient = function(index) {
        const patient = patients[index - 1];
        if (!patient) {
            console.error(`❌ Invalid index. Please use a number between 1 and ${patients.length}`);
            return;
        }

        const detailsUrl = `https://app4.curemd.net/curemdc/Patient/datPatient.aspx?intPatient_ID=${patient.hiddenPatientId}&PatientId=${patient.hiddenPatientId}`;

        console.log(`✓ Opening patient details for: ${patient.patientName}`);
        console.log(`  Hidden ID: ${patient.hiddenPatientId}`);
        console.log(`  Account #: ${patient.accountNumber}`);
        console.log(`  URL: ${detailsUrl}\n`);
        console.log("⏳ Once loaded, run this same script again to extract full data.");

        sessionStorage.setItem('curemd_current_patient', JSON.stringify(patient));
        const newWindow = window.top.open(detailsUrl, '_blank');

        if (!newWindow) {
            console.log("⚠️  Pop-up blocked. Copy URL and open manually, then run script again.");
        }

        return patient;
    };

    window.openAllPatients = function() {
        console.log(`Opening ${patients.length} patient tabs...`);
        patients.forEach((patient, idx) => {
            setTimeout(() => {
                const detailsUrl = `https://app4.curemd.net/curemdc/Patient/datPatient.aspx?intPatient_ID=${patient.hiddenPatientId}&PatientId=${patient.hiddenPatientId}`;
                sessionStorage.setItem('curemd_current_patient', JSON.stringify(patient));
                window.top.open(detailsUrl, '_blank');
                console.log(`${idx + 1}/${patients.length}: Opened ${patient.patientName}`);
            }, idx * 500);
        });
        console.log("\n⏳ Run this script on each patient details page to extract data.");
    };

    console.log("To open all patients in separate tabs:");
    console.log("   openAllPatients()\n");

    sessionStorage.setItem('curemd_search_results', JSON.stringify(patients));

    return patients;
})();
