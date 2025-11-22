 // ========== KONFIGURASI ADMIN ==========
        const ADMIN_PASSWORD = "admin123";
        const STORAGE_KEY = "exam_results";
        
        // Variabel global
        let totalSeconds = 90 * 60;
        let timerInterval;
        let recordingInterval;
        let frameRateInterval;
        let attemptCount = 0;
        let examStarted = false;
        let recordingStartTime;
        let frameCount = 0;
        let currentStudentData = {};
        let isPageTransition = false; // Flag untuk menandai transisi halaman

        // Kunci jawaban (untuk demo)
        const answerKey = {
            'q1': 'c', 'q2': 'a', 'q3': 'c', 'q4': 'c', 'q5': 'c',
            'q6': 'd', 'q7': 'c', 'q8': 'e', 'q9': 'b', 'q10': 'a'
        };
        
        // Streams untuk rekaman
        let cameraStream = null;
        let screenStream = null;
        let mediaRecorder = null;
        let recordedChunks = [];
        
        // Elements
        const timerElement = document.getElementById('timer');
        const overlay = document.getElementById('fullscreenOverlay');
        const initialLoading = document.getElementById('initialLoading');
        const permissionOverlay = document.getElementById('permissionOverlay');
        const loadingCountdown = document.getElementById('loadingCountdown');
        const attemptCountElement = document.getElementById('attemptCount');
        const attemptMessageElement = document.getElementById('attemptMessage');
        const cameraVideo = document.getElementById('cameraVideo');
        const screenVideo = document.getElementById('screenVideo');
        const recordingDuration = document.getElementById('recordingDuration');
        const exitAttempts = document.getElementById('exitAttempts');
        const surveillanceStatus = document.getElementById('surveillanceStatus');
        const frameRateElement = document.getElementById('frameRate');
        const multipleChoiceContainer = document.getElementById('multipleChoiceQuestions');
        const essayContainer = document.getElementById('essayQuestions');
        
        // Halaman
        const examPage = document.getElementById('examPage');
        const completionPage = document.getElementById('completionPage');
        const adminPage = document.getElementById('adminPage');
        const answerModal = document.getElementById('answerModal');

        // ========== FUNGSI UTAMA ==========
        
        // Generate soal ujian
        function generateExamQuestions() {
            // Generate soal pilihan ganda
            const questions = [
                "Hasil dari 2³ + 3² adalah...",
                "Jika f(x) = 2x - 5, maka nilai f(4) adalah...",
                "Sebuah persegi panjang memiliki panjang 12 cm dan lebar 8 cm. Berapakah luasnya?",
                "Nilai dari √144 adalah...",
                "Hasil dari 5! (5 faktorial) adalah...",
                "Jika a = 3 dan b = 4, maka nilai dari a² + b² adalah...",
                "Sebuah lingkaran memiliki jari-jari 7 cm. Berapakah luasnya? (π = 22/7)",
                "Hasil dari 3/4 + 1/2 adalah...",
                "Nilai x dari persamaan 2x + 5 = 15 adalah...",
                "Sebuah segitiga memiliki alas 10 cm dan tinggi 8 cm. Berapakah luasnya?"
            ];

            questions.forEach((question, i) => {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question';
                questionDiv.innerHTML = `
                    <div class="question-text">${i + 1}. ${question}</div>
                    <div class="options">
                        <label class="option"><input type="radio" name="q${i + 1}" value="a"> a. ${getOptionText(i + 1, 'a')}</label>
                        <label class="option"><input type="radio" name="q${i + 1}" value="b"> b. ${getOptionText(i + 1, 'b')}</label>
                        <label class="option"><input type="radio" name="q${i + 1}" value="c"> c. ${getOptionText(i + 1, 'c')}</label>
                        <label class="option"><input type="radio" name="q${i + 1}" value="d"> d. ${getOptionText(i + 1, 'd')}</label>
                        <label class="option"><input type="radio" name="q${i + 1}" value="e"> e. ${getOptionText(i + 1, 'e')}</label>
                    </div>
                `;
                multipleChoiceContainer.appendChild(questionDiv);
            });

            // Generate soal essay
            const essayTopics = [
                "Jelaskan teorema Pythagoras dan berikan contoh penerapannya!",
                "Bagaimana cara menyelesaikan sistem persamaan linear dua variabel?",
                "Jelaskan konsep turunan dalam matematika dan aplikasinya!"
            ];

            essayTopics.forEach((topic, index) => {
                const essayDiv = document.createElement('div');
                essayDiv.className = 'question';
                essayDiv.innerHTML = `
                    <div class="question-text">${index + 1}. ${topic}</div>
                    <textarea name="essay${index + 1}" placeholder="Tulis jawaban Anda di sini..."></textarea>
                `;
                essayContainer.appendChild(essayDiv);
            });
        }

        // Helper function untuk option text
        function getOptionText(questionNum, option) {
            const options = {
                1: { a: '11', b: '12', c: '13', d: '17', e: '18' },
                2: { a: '3', b: '4', c: '5', d: '6', e: '7' },
                3: { a: '20 cm²', b: '40 cm²', c: '96 cm²', d: '100 cm²', e: '120 cm²' },
                4: { a: '10', b: '11', c: '12', d: '13', e: '14' },
                5: { a: '25', b: '60', c: '120', d: '125', e: '150' },
                6: { a: '7', b: '12', c: '16', d: '25', e: '49' },
                7: { a: '44 cm²', b: '88 cm²', c: '154 cm²', d: '196 cm²', e: '308 cm²' },
                8: { a: '1/4', b: '1/2', c: '3/4', d: '1', e: '1¼' },
                9: { a: '3', b: '5', c: '7', d: '8', e: '10' },
                10: { a: '40 cm²', b: '45 cm²', c: '50 cm²', d: '60 cm²', e: '80 cm²' }
            };
            return options[questionNum]?.[option] || 'Option';
        }

        // Kumpulkan jawaban siswa
        function collectStudentAnswers() {
            const answers = {};
            
            // Kumpulkan jawaban pilihan ganda
            for (let i = 1; i <= 10; i++) {
                const selectedOption = document.querySelector(`input[name="q${i}"]:checked`);
                answers[`q${i}`] = selectedOption ? selectedOption.value : null;
            }
            
            // Kumpulkan jawaban essay
            for (let i = 1; i <= 3; i++) {
                const essayAnswer = document.querySelector(`textarea[name="essay${i}"]`).value;
                answers[`essay${i}`] = essayAnswer || '';
            }
            
            return answers;
        }

        // Simpan hasil ujian
        function saveExamResults() {
            const studentData = {
                nama: document.getElementById('nama').value,
                kelas: document.getElementById('kelas').value,
                mapel: document.getElementById('mapel').value,
                nomor: document.getElementById('nomor').value,
                waktuSubmit: new Date().toLocaleString('id-ID'),
                timestamp: new Date().getTime(),
                answers: collectStudentAnswers()
            };
            
            currentStudentData = studentData;
            
            const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const existingIndex = existingData.findIndex(item => item.nomor === studentData.nomor);
            
            if (existingIndex !== -1) {
                existingData[existingIndex] = studentData;
            } else {
                existingData.push(studentData);
            }
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));
            
            return studentData;
        }

        // Tampilkan halaman hasil
        function showCompletionPage(studentData) {
            isPageTransition = true; // Set flag transisi halaman
            examPage.classList.add('hidden');
            completionPage.classList.remove('hidden');
            
            document.getElementById('resultNama').textContent = studentData.nama;
            document.getElementById('resultKelas').textContent = studentData.kelas;
            document.getElementById('resultMapel').textContent = studentData.mapel;
            document.getElementById('resultNomor').textContent = studentData.nomor;
            document.getElementById('resultWaktu').textContent = studentData.waktuSubmit;
            
            // Reset flag setelah transisi selesai
            setTimeout(() => {
                isPageTransition = false;
            }, 1000);
        }

        // Tampilkan halaman admin
        function showAdminPage() {
            isPageTransition = true;
            completionPage.classList.add('hidden');
            examPage.classList.add('hidden');
            adminPage.classList.remove('hidden');
            
            setTimeout(() => {
                isPageTransition = false;
            }, 1000);
        }

        // Tampilkan halaman ujian
        function showExamPage() {
            isPageTransition = true;
            adminPage.classList.add('hidden');
            completionPage.classList.add('hidden');
            examPage.classList.remove('hidden');
            
            setTimeout(() => {
                isPageTransition = false;
            }, 1000);
        }

        // Load data siswa untuk admin
        function loadStudentData() {
            const studentsData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const tableBody = document.getElementById('studentsTableBody');
            const searchTerm = document.getElementById('searchStudent').value.toLowerCase();
            
            tableBody.innerHTML = '';
            
            const filteredData = studentsData.filter(student => 
                student.nama.toLowerCase().includes(searchTerm) ||
                student.kelas.toLowerCase().includes(searchTerm) ||
                student.nomor.toLowerCase().includes(searchTerm)
            );
            
            if (filteredData.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">Tidak ada data siswa</td></tr>`;
                return;
            }
            
            filteredData.sort((a, b) => b.timestamp - a.timestamp).forEach((student, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${student.nama}</td>
                    <td>${student.kelas}</td>
                    <td>${student.nomor}</td>
                    <td>${student.waktuSubmit}</td>
                    <td><span style="color: #2ecc71;">Terkumpul</span></td>
                    <td>
                        <button class="btn-secondary" onclick="viewStudentAnswers('${student.nomor}')">Lihat Jawaban</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }

        // Tampilkan jawaban siswa
        function viewStudentAnswers(studentNumber) {
            const studentsData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const student = studentsData.find(s => s.nomor === studentNumber);
            
            if (student) {
                showAnswerModal(student);
            }
        }

        // Tampilkan modal jawaban
        function showAnswerModal(student) {
            const modalContent = document.getElementById('studentAnswerDetails');
            let html = `
                <div class="student-info">
                    <h3>Informasi Siswa</h3>
                    <p><strong>Nama:</strong> ${student.nama}</p>
                    <p><strong>Kelas:</strong> ${student.kelas}</p>
                    <p><strong>Nomor Peserta:</strong> ${student.nomor}</p>
                    <p><strong>Waktu Submit:</strong> ${student.waktuSubmit}</p>
                </div>
            `;
            
            // Jawaban pilihan ganda
            html += `<div class="answer-section"><h3>Jawaban Pilihan Ganda</h3>`;
            for (let i = 1; i <= 10; i++) {
                const questionKey = `q${i}`;
                const studentAnswer = student.answers[questionKey];
                const correctAnswer = answerKey[questionKey];
                const isCorrect = studentAnswer === correctAnswer;
                
                html += `
                    <div class="answer-item ${isCorrect ? 'answer-correct' : 'answer-incorrect'}">
                        <p><strong>Soal ${i}:</strong> ${getQuestionText(i)}</p>
                        <p><strong>Jawaban Siswa:</strong> ${studentAnswer || 'Tidak dijawab'} ${studentAnswer ? `(${getOptionText(i, studentAnswer)})` : ''}</p>
                        <p><strong>Jawaban Benar:</strong> ${correctAnswer} (${getOptionText(i, correctAnswer)})</p>
                        <p><strong>Status:</strong> <span style="color: ${isCorrect ? '#2ecc71' : '#e74c3c'}">${isCorrect ? 'BENAR' : 'SALAH'}</span></p>
                    </div>
                `;
            }
            html += `</div>`;
            
            // Jawaban essay
            html += `<div class="answer-section"><h3>Jawaban Essay</h3>`;
            for (let i = 1; i <= 3; i++) {
                const essayAnswer = student.answers[`essay${i}`];
                html += `
                    <div class="answer-item">
                        <p><strong>Soal ${i}:</strong> ${getEssayQuestionText(i)}</p>
                        <p><strong>Jawaban:</strong></p>
                        <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 5px;">
                            ${essayAnswer || '<em>Tidak dijawab</em>'}
                        </div>
                    </div>
                `;
            }
            html += `</div>`;
            
            modalContent.innerHTML = html;
            answerModal.classList.remove('hidden');
        }

        // Helper function untuk teks soal
        function getQuestionText(num) {
            const questions = [
                "Hasil dari 2³ + 3² adalah...",
                "Jika f(x) = 2x - 5, maka nilai f(4) adalah...",
                "Sebuah persegi panjang memiliki panjang 12 cm dan lebar 8 cm. Berapakah luasnya?",
                "Nilai dari √144 adalah...",
                "Hasil dari 5! (5 faktorial) adalah...",
                "Jika a = 3 dan b = 4, maka nilai dari a² + b² adalah...",
                "Sebuah lingkaran memiliki jari-jari 7 cm. Berapakah luasnya? (π = 22/7)",
                "Hasil dari 3/4 + 1/2 adalah...",
                "Nilai x dari persamaan 2x + 5 = 15 adalah...",
                "Sebuah segitiga memiliki alas 10 cm dan tinggi 8 cm. Berapakah luasnya?"
            ];
            return questions[num - 1] || `Soal ${num}`;
        }

        function getEssayQuestionText(num) {
            const questions = [
                "Jelaskan teorema Pythagoras dan berikan contoh penerapannya!",
                "Bagaimana cara menyelesaikan sistem persamaan linear dua variabel?",
                "Jelaskan konsep turunan dalam matematika dan aplikasinya!"
            ];
            return questions[num - 1] || `Soal Essay ${num}`;
        }

        // Export data
        function exportData() {
            const studentsData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const csvContent = "data:text/csv;charset=utf-8," 
                + "Nama,Kelas,Nomor Peserta,Mata Pelajaran,Waktu Submit\n"
                + studentsData.map(student => 
                    `"${student.nama}","${student.kelas}","${student.nomor}","${student.mapel}","${student.waktuSubmit}"`
                ).join("\n");
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "data_siswa_ujian.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // ========== EVENT LISTENERS ==========
        
        document.getElementById('submitBtn').addEventListener('click', function() {
            if (confirm('Apakah Anda yakin ingin mengumpulkan jawaban? Setelah dikumpulkan, Anda tidak dapat mengubah jawaban.')) {
                const studentData = saveExamResults();
                submitExam();
                showCompletionPage(studentData);
            }
        });

        document.getElementById('adminBtn').addEventListener('click', function() {
            showAdminPage();
        });

        document.getElementById('backToExamBtn').addEventListener('click', function() {
            showExamPage();
        });

        document.getElementById('adminAccessBtn').addEventListener('click', function() {
            showAdminPage();
        });

        document.getElementById('loginAdminBtn').addEventListener('click', function() {
            const password = document.getElementById('adminPassword').value;
            if (password === ADMIN_PASSWORD) {
                document.getElementById('adminContent').classList.remove('hidden');
                loadStudentData();
            } else {
                alert('Password admin salah!');
            }
        });

        document.getElementById('backFromAdminBtn').addEventListener('click', function() {
            showCompletionPage(currentStudentData);
        });

        document.getElementById('backToMainBtn').addEventListener('click', function() {
            showExamPage();
        });

        document.getElementById('exportDataBtn').addEventListener('click', exportData);

        document.getElementById('searchStudent').addEventListener('input', loadStudentData);

        document.getElementById('closeAnswerModal').addEventListener('click', function() {
            answerModal.classList.add('hidden');
        });

        // ========== FUNGSI REKAMAN & PENGAWASAN ==========
        
        // PERBAIKAN: Deteksi pelanggaran hanya jika bukan transisi halaman
        function handleVisibilityChange() {
            if (!examStarted || isPageTransition) return;
            
            if (document.hidden) {
                handleExitAttempt();
            }
        }
        
        function handleWindowBlur() {
            if (!examStarted || isPageTransition) return;
            handleExitAttempt();
        }

        // ... (fungsi lainnya tetap sama)
        
        function keepVideoActive() {
            if (cameraVideo && cameraVideo.paused) {
                cameraVideo.play().catch(e => console.log('Camera video play error:', e));
            }
            if (screenVideo && screenVideo.paused) {
                screenVideo.play().catch(e => console.log('Screen video play error:', e));
            }
        }

        function startFrameRateMonitoring() {
            frameCount = 0;
            frameRateInterval = setInterval(() => {
                frameRateElement.textContent = `${frameCount} fps`;
                frameCount = 0;
            }, 1000);

            const countFrame = () => {
                frameCount++;
                requestAnimationFrame(countFrame);
            };
            requestAnimationFrame(countFrame);
        }
        
        function startExam() {
            examStarted = true;
            initialLoading.classList.add('hidden');
            
            timerInterval = setInterval(updateTimer, 1000);
            recordingStartTime = new Date();
            recordingInterval = setInterval(updateRecordingDuration, 1000);
            startFrameRateMonitoring();
            setupEventListeners();
            generateExamQuestions();
        }
        
        function startLoadingCountdown() {
            let count = 3;
            loadingCountdown.textContent = count;
            
            const countdownInterval = setInterval(() => {
                count--;
                loadingCountdown.textContent = count;
                
                if (count <= 0) {
                    clearInterval(countdownInterval);
                    requestPermissions();
                }
            }, 1000);
        }
        
        async function requestPermissions() {
            permissionOverlay.classList.remove('hidden');
            
            document.getElementById('grantPermission').addEventListener('click', async () => {
                try {
                    surveillanceStatus.textContent = "Meminta izin kamera...";
                    
                    cameraStream = await navigator.mediaDevices.getUserMedia({ 
                        video: { 
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            frameRate: { ideal: 15, max: 30 }
                        },
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            sampleRate: 44100
                        }
                    });
                    
                    surveillanceStatus.textContent = "Meminta izin rekaman layar...";
                    
                    screenStream = await navigator.mediaDevices.getDisplayMedia({
                        video: {
                            cursor: "always",
                            displaySurface: "window"
                        },
                        audio: {
                            echoCancellation: false,
                            noiseSuppression: true,
                            sampleRate: 44100
                        }
                    });
                    
                    cameraVideo.srcObject = cameraStream;
                    screenVideo.srcObject = screenStream;
                    
                    cameraVideo.playsInline = true;
                    screenVideo.playsInline = true;
                    cameraVideo.muted = true;
                    screenVideo.muted = true;
                    
                    await cameraVideo.play();
                    await screenVideo.play();
                    
                    startRecording();
                    
                    permissionOverlay.classList.add('hidden');
                    enterFullscreen();
                    
                } catch (error) {
                    console.error('Error accessing media devices:', error);
                    surveillanceStatus.textContent = "Gagal mengakses media";
                    alert('Tidak dapat mengakses kamera atau layar. Ujian tidak dapat dilanjutkan.');
                }
            });
            
            document.getElementById('denyPermission').addEventListener('click', () => {
                alert('Anda harus memberikan izin akses untuk melanjutkan ujian.');
                permissionOverlay.classList.add('hidden');
                requestPermissions();
            });
        }
        
        function startRecording() {
            try {
                recordedChunks = [];
                
                const recordingStream = screenStream;
                
                mediaRecorder = new MediaRecorder(recordingStream, {
                    mimeType: 'video/webm;codecs=vp9',
                    videoBitsPerSecond: 2500000
                });
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = () => {
                    console.log('Recording stopped');
                };
                
                mediaRecorder.start(5000);
                
                surveillanceStatus.textContent = "Rekaman aktif";
                surveillanceStatus.style.color = "#2ecc71";
                
                setInterval(keepVideoActive, 3000);
                
            } catch (error) {
                console.error('Error starting recording:', error);
                surveillanceStatus.textContent = "Rekaman gagal";
                surveillanceStatus.style.color = "#e74c3c";
            }
        }
        
        function updateRecordingDuration() {
            if (recordingStartTime) {
                const now = new Date();
                const diff = Math.floor((now - recordingStartTime) / 1000);
                
                const hours = Math.floor(diff / 3600);
                const minutes = Math.floor((diff % 3600) / 60);
                const seconds = diff % 60;
                
                recordingDuration.textContent = 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }
        
        function updateTimer() {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            timerElement.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (totalSeconds <= 0) {
                clearInterval(timerInterval);
                alert('Waktu ujian telah habis! Jawaban Anda akan dikumpulkan secara otomatis.');
                const studentData = saveExamResults();
                submitExam();
                showCompletionPage(studentData);
            } else {
                totalSeconds--;
            }
        }
        
        function setupEventListeners() {
            if (!examStarted) return;
            
            document.addEventListener('fullscreenchange', handleFullscreenChange);
            document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.addEventListener('mozfullscreenchange', handleFullscreenChange);
            document.addEventListener('MSFullscreenChange', handleFullscreenChange);
            
            document.addEventListener('visibilitychange', handleVisibilityChange);
            
            window.addEventListener('blur', handleWindowBlur);
            
            document.addEventListener('copy', preventCopy);
            document.addEventListener('cut', preventCopy);
            document.addEventListener('contextmenu', preventContextMenu);
            
            document.addEventListener('keydown', preventShortcuts);
            document.addEventListener('scroll', keepVideoActive);
        }
        
        function handleFullscreenChange() {
            if (!examStarted || isPageTransition) return;
            
            if (!document.fullscreenElement && 
                !document.webkitFullscreenElement && 
                !document.mozFullScreenElement &&
                !document.msFullscreenElement) {
                handleExitAttempt();
            }
        }
        
        function handleExitAttempt() {
            attemptCount++;
            attemptCountElement.textContent = attemptCount;
            exitAttempts.textContent = attemptCount;
            
            if (attemptCount >= 3) {
                attemptMessageElement.textContent = 'Anda telah melebihi batas percobaan! Ujian akan diakhiri.';
                setTimeout(() => {
                    const studentData = saveExamResults();
                    submitExam();
                    showCompletionPage(studentData);
                }, 3000);
            } else {
                attemptMessageElement.textContent = 'Percobaan ini akan dicatat!';
            }
            
            overlay.classList.remove('hidden');
            
            setTimeout(() => {
                enterFullscreen();
                overlay.classList.add('hidden');
            }, 5000);
        }
        
        function preventCopy(e) {
            e.preventDefault();
            alert('Tidak diizinkan menyalin teks selama ujian!');
        }
        
        function preventContextMenu(e) {
            e.preventDefault();
            alert('Menu klik kanan tidak diizinkan selama ujian!');
        }
        
        function preventShortcuts(e) {
            if ((e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X' || e.key === 'v' || e.key === 'V')) ||
                e.key === 'F11' || e.key === 'F12' ||
                e.key === 'PrintScreen' ||
                (e.altKey && e.key === 'Tab') || e.key === 'Meta') {
                e.preventDefault();
                handleExitAttempt();
            }
        }
        
        function enterFullscreen() {
            const element = document.documentElement;
            
            if (element.requestFullscreen) {
                element.requestFullscreen().catch(err => {
                    console.log('Error attempting to enable fullscreen:', err);
                });
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
            
            setTimeout(startExam, 1000);
        }
        
        function submitExam() {
            clearInterval(timerInterval);
            clearInterval(recordingInterval);
            clearInterval(frameRateInterval);
            
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
            
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
            }
            
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
        
        // Memulai proses loading saat halaman dimuat
        window.addEventListener('load', function() {
            startLoadingCountdown();
        });

        // Expose function untuk global access
        window.viewStudentAnswers = viewStudentAnswers;
        window.viewStudentDetails = function(studentNumber) {
            viewStudentAnswers(studentNumber);
        };