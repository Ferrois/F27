// --- Global State Variables for Fall Detection ---
const FREEFALL_THRESHOLD_G = 0.5; // Total acceleration less than 0.5g (approx 4.9 m/s²)
const IMPACT_THRESHOLD_G = 3.5;   // Total acceleration greater than 3.5g (approx 34.3 m/s²)
const G_VALUE = 9.80665;          // Standard gravity in m/s²

let isFalling = false;
let fallTimer = null; // Used to limit the duration of the 'freefall' state

// Helper function for the alert sound
function playAlertSound() {
    try {
        // Use a simple sound (like a beep) for demonstration
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note

        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, 500); // Play for 0.5 seconds

        console.log("Alert Sound Played!");

    } catch (e) {
        console.error("Could not play sound: ", e);
        // Fallback alert if AudioContext fails
        alert("FALL DETECTED: IMPACT ALERT!");
    }
}

// Function to handle the Accelerometer reading and fall detection
function checkFallDetection(accelerometer) {
    // Read raw acceleration data (Ax, Ay, Az)
    const Ax = accelerometer.x;
    const Ay = accelerometer.y;
    const Az = accelerometer.z;

    // Calculate the total magnitude of the acceleration vector
    // A_total = sqrt(Ax^2 + Ay^2 + Az^2)
    const totalAcceleration = Math.sqrt(
        Ax * Ax +
        Ay * Ay +
        Az * Az
    );

    // Convert to G-force for easier threshold comparison
    const totalAccelerationG = totalAcceleration / G_VALUE;

    // 1. Check for **FREEFALL** state (Acceleration close to 0G)
    if (totalAccelerationG < FREEFALL_THRESHOLD_G) {
        if (!isFalling) {
            console.log('--- ENTERING FREEFALL STATE ---');
            isFalling = true;

            // Set a timer: if impact doesn't happen within, say, 1 second, reset the state
            fallTimer = setTimeout(() => {
                isFalling = false;
                console.log('Freefall timed out. Resetting state.');
            }, 1000); // 1000 ms = 1 second window for impact
        }
    }

    // 2. Check for **IMPACT** state (Massive spike in acceleration)
    else if (isFalling && totalAccelerationG > IMPACT_THRESHOLD_G) {

        console.warn(`*** FALL DETECTED! *** Impact Force: ${totalAccelerationG.toFixed(2)} G`);

        // Clear the timer and reset state immediately
        clearTimeout(fallTimer);
        isFalling = false;

        // Sound the alarm!
        playAlertSound();

        // Optional: Send a network request to a monitoring service here
        // sendFallAlertToService(Ax, Ay, Az, totalAccelerationG);

        // Prevent rapid, repeated alerts by disabling the detection momentarily
        document.getElementById('start-sensors-btn').textContent = 'FALL DETECTED! Alerting...';

    }

    // 3. Reset the state if acceleration returns to normal without an impact
    else if (isFalling && totalAccelerationG >= 0.8 * G_VALUE && totalAccelerationG <= 1.2 * G_VALUE) {
        // If the device lands gently or the movement was not an impact, reset.
        if (fallTimer) {
            clearTimeout(fallTimer);
        }
        isFalling = false;
    }
}


// --- ORIGINAL CODE MODIFIED TO INCLUDE FALL DETECTION ---

document.getElementById('start-sensors-btn').addEventListener('click', () => {
    // ... (Permission request logic is the same)
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(state => {
                if (state === 'granted') {
                    startGenericSensors();
                } else {
                    alert('Permission for motion sensors denied by user.');
                }
            })
            .catch(error => {
                console.error('Permission request failed:', error);
                alert('Error requesting permission. Check console for details.');
            });
    } else {
        startGenericSensors();
    }
});

function startGenericSensors() {
    // --- Accelerometer Setup MODIFIED ---
    if ('Accelerometer' in window) {
        try {
            const accelerometer = new Accelerometer({ frequency: 60 }); // 60 readings per second

            accelerometer.addEventListener('reading', () => {
                // Update display
                document.getElementById('accel-x').textContent = accelerometer.x.toFixed(2);
                document.getElementById('accel-y').textContent = accelerometer.y.toFixed(2);
                document.getElementById('accel-z').textContent = accelerometer.z.toFixed(2);

                // *** CALL THE NEW FALL DETECTION FUNCTION ***
                checkFallDetection(accelerometer);
            });
            // ... (Error handling is the same)
            accelerometer.addEventListener('error', event => {
                handleSensorError('Accelerometer', event.error);
            });

            accelerometer.start();
            console.log('Accelerometer started.');
        } catch (error) {
            handleSensorConstructionError('Accelerometer', error);
        }
    } else {
        document.getElementById('accel-x').textContent = 'API Not Supported';
        console.log('Accelerometer API is not supported in this browser.');
    }

    // --- Gyroscope Setup (Unchanged but remains for completeness) ---
    if ('Gyroscope' in window) {
        try {
            const gyroscope = new Gyroscope({ frequency: 60 });

            gyroscope.addEventListener('reading', () => {
                document.getElementById('gyro-x').textContent = (gyroscope.x * (180 / Math.PI)).toFixed(2);
                document.getElementById('gyro-y').textContent = (gyroscope.y * (180 / Math.PI)).toFixed(2);
                document.getElementById('gyro-z').textContent = (gyroscope.z * (180 / Math.PI)).toFixed(2);
            });

            gyroscope.addEventListener('error', event => {
                handleSensorError('Gyroscope', event.error);
            });

            gyroscope.start();
            console.log('Gyroscope started.');
        } catch (error) {
            handleSensorConstructionError('Gyroscope', error);
        }
    } else {
        document.getElementById('gyro-x').textContent = 'API Not Supported';
        console.log('Gyroscope API is not supported in this browser.');
    }

    // Optional: Disable the button once the process starts
    document.getElementById('start-sensors-btn').disabled = true;
    document.getElementById('start-sensors-btn').textContent = 'Sensors Running (Fall Detection Active)';
}

// ... (Error handling functions handleSensorError and handleSensorConstructionError are the same)