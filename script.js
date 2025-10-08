        // --- BACKEND SETUP NOTE ---
        /*
        *********************************************************************************
        * TO ENABLE REAL ALERTS: 
        * 1. Deploy the sendTelegramAlert and sendSMSAlert functions to Firebase/GCP.
        * 2. Replace the placeholder URLs below with your deployed function URLs.
        *********************************************************************************
        */
        // PLACEHOLDER URLS - REPLACE THESE AFTER DEPLOYMENT
        const TELEGRAM_URL = "http://127.0.0.1:4000/floodx-d3a60/us-central1/sendTelegramAlert"; // Local emulator URL for testing
        const TWILIO_URL ="http://127.0.0.1:4000/floodx-d3a60/us-central1/sendSMSAlert"; // Local emulator URL for testing

        
        // --- GEMINI API Configuration ---
        const apiKey = "AIzaSyDaBxadGe6423DtSVcnADPcZM6DlZI6PkM"; // Replace with your actual Gemini API key
        const apiUrlBase = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";
        const MAX_RETRIES = 3;

        // --- Utility Function: Call Gemini API with Backoff ---
        async function callGeminiApi(payload, retries = 0) {
            const apiUrl = `${apiUrlBase}?key=${apiKey}`;
            
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    if (retries < MAX_RETRIES && response.status === 429) {
                        const delay = Math.pow(2, retries) * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return callGeminiApi(payload, retries + 1);
                    }
                    throw new Error(`API call failed with status: ${response.status}`);
                }

                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Error: No text generated.";
                return text;

            } catch (error) {
                console.error("Gemini API Error:", error);
                return `Error: Failed to fetch response. ${error.message}`;
            }
        }

        // --- 1. Stakeholder Data for Modal (Unchanged) ---
        const stakeholderData = {
            ASDMA: {
                title: "ASDMA (Assam State Disaster Management Authority)",
                description: "ASDMA is the driving force behind FLEWS, responsible for policy, coordination, and the critical dissemination chain to the local level.",
                details: [
                    "Initiating the dialogue and keeping momentum among all stakeholders.",
                    "Convening periodic review meetings.",
                    "Providing relevant data and maps.",
                    "Disseminating Flood Advisory to District Administration, Circle Officers, and Gaon Buras.",
                    "Validation of flood advisories issued by NESAC."
                ]
            },
            NESAC: {
                title: "NESAC (North Eastern Space Application Centre)",
                description: "NESAC developed the core FLEWS model and is responsible for the technical output and generation of the alerts.",
                details: [
                    "Developing and running the WRF and HEC-HMS hydrological models.",
                    "Hydro-Meteorological data collection and analysis.",
                    "Issuing Flood Warning Alerts in magnitude, location, and probable time.",
                    "Monitoring of Embankment Breaches using satellite data."
                ]
            },
            IMD: {
                title: "IMD (Indian Meteorological Department)",
                description: "The IMD provides essential raw and processed meteorological inputs required for the accuracy of the WRF model and synoptic analysis.",
                details: [
                    "Providing daily weather forecasts.",
                    "Supplying real-time satellite images and products (e.g., Kalpana 1 imagery).",
                    "Issuing Quantitative Precipitation Forecast (QPF) and synoptic weather advisories."
                ]
            },
            'CWC/AWRD': {
                title: "CWC (Central Water Commission) & AWRD (Assam Water Resources Dept.)",
                description: "These agencies provide crucial ground truth data on river stages for model calibration and ongoing monitoring.",
                details: [
                    "CWC: Disseminating daily water level for major rivers.",
                    "AWRD: Monitoring water level for different rivers and disseminating field data.",
                    "Providing ground observations for model calibration and checking saturation conditions."
                ]
            }
        };

        // --- 2. Modal Functions (Unchanged) ---
        const modal = document.getElementById('stakeholder-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalDescription = document.getElementById('modal-description');
        const modalDetails = document.getElementById('modal-details');

        function showModal(stakeholderKey) {
            const data = stakeholderData[stakeholderKey];
            if (!data) return;

            modalTitle.textContent = data.title;
            modalDescription.textContent = data.description;
            modalDetails.innerHTML = data.details.map(detail => 
                `<p class="flex items-start"><svg class="w-5 h-5 mr-2 text-cyan-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>${detail}</p>`
            ).join('');
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });


        // --- 3. Tab Switching Functionality (Unchanged) ---
        function switchTab(tabId) {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));

            document.getElementById(`${tabId}-tab`).classList.add('active');
            document.getElementById(tabId).classList.remove('hidden');
        }
        
        // --- 8. New: Toggle Dissemination Details (Unchanged) ---
        function toggleDetails(id, iconId) {
            const content = document.getElementById(id);
            const icon = document.getElementById(iconId);
            
            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                if (icon) icon.classList.add('rotate-180');
            } else {
                content.classList.add('hidden');
                if (icon) icon.classList.remove('rotate-180');
            }
        }


        // --- 4. Smooth Scrolling for Navigation (Unchanged) ---
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });

        // --- NEW FLOATING ALERT BOT FUNCTIONS ---
        function showAlertBox(message) {
            const alertBox = document.getElementById("floatingAlertBot");
            const alertMessage = document.getElementById("alertMessage");

            alertMessage.innerText = message;
            alertBox.style.display = "block";
        }

        function closeFloatingAlert() {
            document.getElementById("floatingAlertBot").style.display = "none";
        }

        // --- 5. Updated: Water Gauge Status Logic and GEMINI Feature 1 ---
        const WARNING_LEVEL = 85.00; // Dikrong River Warning Level (Simulated)
        const DANGER_LEVEL = 86.60; // Dikrong River Danger Level (Actual D/L from document)

        async function generateGuidance(level, status) {
            const contentContainer = document.getElementById('llm-guidance-content');
            const loader = document.getElementById('guidance-loader');
            
            loader.classList.remove('hidden');
            contentContainer.innerHTML = 'Analyzing threat level and generating localized advice...';

            const systemPrompt = `You are the Assam Flood Safety Officer. Based on a river level of ${level}m (${status} status), provide extremely concise, actionable, bulleted safety instructions for a citizen near the Dikrong River in Lakhimpur, Assam. Focus on immediate steps for life safety and property protection. Keep the entire response under 60 words and ensure the tone is urgent but calm.`;
            
            const payload = {
                contents: [{ parts: [{ text: "Generate flood safety guidance now." }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
            };

            const responseText = await callGeminiApi(payload);

            contentContainer.innerHTML = responseText;
            loader.classList.add('hidden');
        }


        function updateGaugeStatus() {
            const levelInput = document.getElementById('water-level-input');
            const statusBox = document.getElementById('gauge-status-box');
            const statusText = document.getElementById('gauge-status');
            const guidanceContainer = document.getElementById('llm-guidance-container');
            const level = parseFloat(levelInput.value);

            if (isNaN(level) || level < 80) {
                statusText.textContent = "Enter a valid level (in meters)";
                statusBox.className = "p-4 rounded-lg text-center font-bold transition-colors duration-300 bg-gray-100 text-gray-700";
                guidanceContainer.classList.add('hidden');
                closeFloatingAlert();
                return;
            }

            if (level >= DANGER_LEVEL) {
                statusText.textContent = `DANGER! ${level.toFixed(2)}m (EVACUATE)`;
                statusBox.className = "p-4 rounded-lg text-center font-bold transition-colors duration-300 bg-red-600 text-white shadow-lg";
                guidanceContainer.classList.remove('hidden');
                generateGuidance(level, 'DANGER');
                showAlertBox(`DANGER LEVEL ALERT: Dikrong River at ${level.toFixed(2)}m. IMMEDIATE EVACUATION required.`);

            } else if (level >= WARNING_LEVEL) {
                statusText.textContent = `WARNING! ${level.toFixed(2)}m (PREPARE)`;
                statusBox.className = "p-4 rounded-lg text-center font-bold transition-colors duration-300 bg-orange-400 text-gray-900 shadow-md";
                guidanceContainer.classList.remove('hidden');
                generateGuidance(level, 'WARNING');
                showAlertBox(`WARNING: Dikrong River nearing danger mark (${level.toFixed(2)}m). Prepare for evacuation.`);
            } else {
                statusText.textContent = `SAFE: ${level.toFixed(2)}m`;
                statusBox.className = "p-4 rounded-lg text-center font-bold transition-colors duration-300 bg-green-500 text-white";
                guidanceContainer.classList.add('hidden');
                closeFloatingAlert();
            }
        }
        
        // --- 6. Alert Subscription Logic (Backend Integration Ready) ---
        async function subscribeAlerts(event) {
            event.preventDefault();
            const phoneInput = document.getElementById('phone-input');
            const telegramInput = document.getElementById('telegram-input');
            const subscribeButton = document.getElementById('subscribe-button');
            const subscribeMessage = document.getElementById('subscribe-message');

            const phone = phoneInput.value.trim();
            const telegram = telegramInput.value.trim();

            if (!phone && !telegram) {
                subscribeMessage.textContent = "Please provide a mobile number or Telegram handle to subscribe.";
                subscribeMessage.className = "mt-4 text-center font-medium text-red-600 block";
                return;
            }
            
            subscribeButton.disabled = true;
            subscribeButton.textContent = 'Subscribing...';
            subscribeMessage.className = "mt-4 text-center font-medium text-blue-700 bg-blue-100 p-3 rounded-lg block";
            subscribeMessage.textContent = 'Initiating subscription process...';
            
            let allSuccess = true;
            let finalMessage = "";

            // --- 6a. Telegram Alert Subscription ---
            if (telegram && TELEGRAM_URL) {
                subscribeMessage.textContent = 'Attempting Telegram subscription...';
                const telegramData = { message: `New FLEWS subscription request for Telegram handle: ${telegram}` }; // Custom message for logging
                
                try {
                    const response = await fetch(TELEGRAM_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(telegramData)
                    });
                    
                    if (!response.ok) throw new Error(`Telegram server failed (${response.status})`);
                    finalMessage += `Telegram subscription initiated. `;
                } catch (error) {
                    allSuccess = false;
                    finalMessage += `ERROR: Telegram subscription failed. `;
                    console.error("Telegram Subscription Error:", error);
                }
            } else if (telegram) {
                finalMessage += `Telegram: Simulated. `;
            }


            // --- 6b. SMS Alert Subscription ---
            if (phone && TWILIO_URL) {
                subscribeMessage.textContent = 'Attempting SMS subscription...';
                const smsData = { 
                    message: `FLEWS ALERT: Your number ${phone} is registered for real-time flood alerts.`, // A confirmation SMS
                    number: phone 
                };
                
                try {
                    const response = await fetch(TWILIO_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(smsData)
                    });
                    
                    if (!response.ok) throw new Error(`Twilio server failed (${response.status})`);
                    finalMessage += `SMS subscription initiated. `;
                } catch (error) {
                    allSuccess = false;
                    finalMessage += `ERROR: SMS subscription failed. `;
                    console.error("SMS Subscription Error:", error);
                }

            } else if (phone) {
                finalMessage += `SMS: Simulated. `;
            }


            // --- 6c. Finalize Message ---
            let colorClass = allSuccess ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100";
            let status = allSuccess ? "Successful" : "Partially/Fully Failed";
            let action = (TELEGRAM_URL || TWILIO_URL) ? "sent to your backend for processing." : "simulated in the browser.";

            subscribeMessage.innerHTML = `Subscription Status: <strong>${status}</strong>.<br>
                                        Details: ${finalMessage}
                                        Your request has been ${action}`;
            subscribeMessage.className = `mt-4 text-center font-medium p-3 rounded-lg block ${colorClass}`;
            
            // Clean up
            if (allSuccess) {
                phoneInput.value = '';
                telegramInput.value = '';
            }
            subscribeButton.disabled = false;
            subscribeButton.textContent = 'Subscribe to FLEWS Alerts';
        }

        // --- 7. GEMINI Feature 2: Stakeholder Q&A Logic (Unchanged) ---
        async function handleQAGeneration(event) {
            event.preventDefault();
            const qaInput = document.getElementById('qa-input');
            const qaButton = document.getElementById('qa-button');
            const qaOutputContainer = document.getElementById('qa-output-container');
            const qaOutput = document.getElementById('qa-output');
            
            const userQuery = qaInput.value.trim();
            if (!userQuery) return;

            // Disable button and show loading state
            qaButton.disabled = true;
            qaButton.textContent = 'Analyzing Report...';
            qaOutputContainer.classList.remove('hidden');
            qaOutput.innerHTML = '<p class="text-gray-500 italic">Analyzing the FLEWS documentation to provide an expert answer...</p>';
            qaOutput.classList.remove('bg-purple-50');
            qaOutput.classList.add('bg-gray-100');

            const systemPrompt = `You are a specialist analyst of the Flood Early Warning System (FLEWS) report for Assam. Answer the user's question concisely and accurately based solely on the provided context of the FLEWS project. If the answer involves technical models (like HEC-HMS or WRF), explain their relevance to the administrative process (e.g., alert generation, dissemination). Do not use external knowledge or fictional details. Keep the response factual and under 150 words.`;

            // Note: In a real implementation, the full FLEWS document content would be used as grounding data here.
            // Since we don't have the full document text readily accessible in JS, we rely on the prompt context and LLM's general knowledge about flood systems based on the detailed system prompt.
            
            const payload = {
                contents: [{ parts: [{ text: `User Question about FLEWS: ${userQuery}` }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] }
            };

            const responseText = await callGeminiApi(payload);

            // Re-enable button and show result
            qaButton.disabled = false;
            qaButton.textContent = 'Generate Expert Answer ✨';
            qaOutput.innerHTML = responseText;
            qaOutput.classList.remove('bg-gray-100');
            qaOutput.classList.add('bg-purple-50');
        }

        // --- NEW: Dark Mode Toggle Logic ---
        function setIcon(isDark) {
            document.getElementById('theme-icon').textContent = isDark ? '☀️' : '🌙';
        }

        function toggleDarkMode() {
            const isDark = document.body.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            setIcon(isDark);
        }

        // Apply theme on load
        (function initTheme() {
            const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            
            if (savedTheme === 'dark') {
                document.body.classList.add('dark');
                setIcon(true);
            } else {
                setIcon(false);
            }
        })();


        // Initialize the gauge status on page load
        window.onload = function() {
            updateGaugeStatus();
        }