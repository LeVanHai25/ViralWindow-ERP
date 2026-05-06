import sys
import re

file_path = r"d:\ViralWindow_Phan_Mem_Nhom_Kinh\FontEnd\forgot-password.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = "    </div>\n            }, 5000);\n        }"
idx = content.find(target)

if idx != -1:
    script_part = """    </div>
    <script>
        const API_BASE = window.API_BASE || '/api';
        let resetToken = null;
        let userEmail = null;

        function toggleEye(fieldId, iconId) {
            const inp = document.getElementById(fieldId);
            const icon = document.getElementById(iconId);
            if (inp.type === 'password') {
                inp.type = 'text';
                icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>`;
            } else {
                inp.type = 'password';
                icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>`;
            }
        }

        function togglePasswordVisibility(fieldId) {
            const map = { newPassword:'eyeIconNewPassword', confirmNewPassword:'eyeIconConfirmNewPassword' };
            toggleEye(fieldId, map[fieldId] || ('eyeIcon'+fieldId.charAt(0).toUpperCase()+fieldId.slice(1)));
        }

        function showAlert(message, type = 'error') {
            const alertDiv = document.getElementById('alertMessage');
            alertDiv.style.cssText = type === 'error'
                ? 'display:block;background:#FEF2F2;color:#991B1B;border:1px solid #FECACA;padding:12px 16px;border-radius:12px;font-size:0.85rem;font-weight:500;margin-bottom:16px;'
                : 'display:block;background:#F0FDF4;color:#166534;border:1px solid #BBF7D0;padding:12px 16px;border-radius:12px;font-size:0.85rem;font-weight:500;margin-bottom:16px;';
            alertDiv.textContent = message;
            setTimeout(() => { alertDiv.style.display = 'none'; }, 5000);
        }

        function updateStepIndicator(step) {
            const dots = ['stepDot1', 'stepDot2', 'stepDot3'];
            dots.forEach((dotId, index) => {
                const dot = document.getElementById(dotId);
                dot.classList.remove('active', 'completed');
                if (index + 1 < step) {
                    dot.classList.add('completed');
                    dot.style.background = '#22c55e';
                    dot.style.width = '10px';
                    dot.style.borderRadius = '50%';
                } else if (index + 1 === step) {
                    dot.classList.add('active');
                    dot.style.background = '#1565C0';
                    dot.style.width = '24px';
                    dot.style.borderRadius = '5px';
                } else {
                    dot.style.background = '#e5e7eb';
                    dot.style.width = '10px';
                    dot.style.borderRadius = '50%';
                }
            });
        }

        async function handleForgotPassword(event) {
            event.preventDefault();
            const email = document.getElementById('email').value;
            userEmail = email;

            const btn = document.getElementById('submitButton');
            const btnText = document.getElementById('submitButtonText');
            const btnLoader = document.getElementById('submitButtonLoader');

            btn.disabled = true; btnText.classList.add('hidden'); btnLoader.classList.remove('hidden');

            try {
                const response = await fetch(`${API_BASE}/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const result = await response.json();
                if (result.success) {
                    showAlert('Mã xác thực đã được gửi đến email của bạn!', 'success');
                    document.getElementById('step1').classList.add('hidden');
                    document.getElementById('step2').classList.remove('hidden');
                    document.getElementById('emailDisplay').textContent = email;
                    updateStepIndicator(2);
                } else {
                    showAlert(result.message || 'Email không tồn tại trong hệ thống');
                }
            } catch (error) {
                showAlert('Lỗi kết nối server. Vui lòng thử lại sau.');
            } finally {
                btn.disabled = false; btnText.classList.remove('hidden'); btnLoader.classList.add('hidden');
            }
        }

        async function handleVerifyCode(event) {
            event.preventDefault();
            const code = document.getElementById('code').value;

            const btn = document.getElementById('verifyButton');
            const btnText = document.getElementById('verifyButtonText');
            const btnLoader = document.getElementById('verifyButtonLoader');

            btn.disabled = true; btnText.classList.add('hidden'); btnLoader.classList.remove('hidden');

            try {
                const response = await fetch(`${API_BASE}/auth/verify-reset-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail, reset_code: code })
                });
                const result = await response.json();
                if (result.success) {
                    resetToken = result.reset_token;
                    showAlert('Xác thực thành công!', 'success');
                    document.getElementById('step2').classList.add('hidden');
                    document.getElementById('step3').classList.remove('hidden');
                    updateStepIndicator(3);
                } else {
                    showAlert(result.message || 'Mã xác thực không đúng hoặc đã hết hạn');
                    document.getElementById('codeError').textContent = 'Mã không hợp lệ';
                    document.getElementById('codeError').classList.remove('hidden');
                }
            } catch (error) {
                showAlert('Lỗi kết nối server. Vui lòng thử lại sau.');
            } finally {
                btn.disabled = false; btnText.classList.remove('hidden'); btnLoader.classList.add('hidden');
            }
        }

        async function handleResetPassword(event) {
            event.preventDefault();
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            if (newPassword !== confirmNewPassword) {
                document.getElementById('confirmNewPasswordError').textContent = 'Mật khẩu xác nhận không khớp';
                document.getElementById('confirmNewPasswordError').classList.remove('hidden');
                return;
            } else {
                document.getElementById('confirmNewPasswordError').classList.add('hidden');
            }

            if (newPassword.length < 6) {
                document.getElementById('newPasswordError').textContent = 'Mật khẩu phải có ít nhất 6 ký tự';
                document.getElementById('newPasswordError').classList.remove('hidden');
                return;
            } else {
                document.getElementById('newPasswordError').classList.add('hidden');
            }

            const btn = document.getElementById('resetButton');
            const btnText = document.getElementById('resetButtonText');
            const btnLoader = document.getElementById('resetButtonLoader');

            btn.disabled = true; btnText.classList.add('hidden'); btnLoader.classList.remove('hidden');

            try {
                const response = await fetch(`${API_BASE}/auth/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: userEmail,
                        reset_token: resetToken,
                        new_password: newPassword
                    })
                });
                const result = await response.json();
                if (result.success) {
                    showAlert('Đặt lại mật khẩu thành công!', 'success');
                    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                } else {
                    showAlert(result.message || 'Đặt lại mật khẩu thất bại');
                }
            } catch (error) {
                showAlert('Lỗi kết nối server. Vui lòng thử lại sau.');
            } finally {
                btn.disabled = false; btnText.classList.remove('hidden'); btnLoader.classList.add('hidden');
            }
        }

        async function resendCode() {
            if (!userEmail) return;
            try {
                const response = await fetch(`${API_BASE}/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail })
                });
                const result = await response.json();
                if (result.success) {
                    showAlert('Mã xác thực mới đã được gửi!', 'success');
                } else {
                    showAlert(result.message || 'Không thể gửi lại mã');
                }
            } catch (error) {
                showAlert('Lỗi kết nối server. Vui lòng thử lại sau.');
            }
        }

        async function loadCompanyName() {
            try {
                const response = await fetch(`${API_BASE}/company-settings`);
                const result = await response.json();
                if (result.success && result.data) {
                    if (result.data.company_name) {
                        document.getElementById('companyNameLeft').textContent = result.data.company_name.toUpperCase();
                    }
                    if (result.data.logo_path) {
                        const img = document.getElementById('companyLogoLeft');
                        const def = document.getElementById('defaultLogoIcon');
                        if (img && def) {
                            img.src = result.data.logo_path;
                            img.style.display = 'block';
                            def.style.display = 'none';
                        }
                    }
                }
            } catch (error) {
                console.error('Lỗi load company name:', error);
            }
        }

        document.getElementById('confirmNewPassword').addEventListener('input', function() {
            const pw = document.getElementById('newPassword').value;
            if (this.value && pw !== this.value) {
                document.getElementById('confirmNewPasswordError').textContent = 'Mật khẩu xác nhận không khớp';
                document.getElementById('confirmNewPasswordError').classList.remove('hidden');
            } else {
                document.getElementById('confirmNewPasswordError').classList.add('hidden');
            }
        });

        document.getElementById('code')?.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
        });

        document.addEventListener('DOMContentLoaded', function() {
            loadCompanyName();
        });
    </script>
</body>
</html>"""
    
    new_content = content[:idx] + script_part
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Script replaced successfully")
else:
    # Try another marker
    idx2 = content.find('            }, 5000);\n        }')
    if idx2 != -1:
        # We need to backtrack to the closing of the auth-wrapper
        idx3 = content.rfind('</div>', 0, idx2)
        idx4 = content.rfind('</div>', 0, idx3)
        if idx4 != -1:
            new_content = content[:idx4] + script_part
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print("Script replaced successfully using fallback marker")
        else:
            print("Fallback marker backgracking failed")
    else:
        print("Target not found")