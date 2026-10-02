document.addEventListener('DOMContentLoaded', () => {
	const passwordInput = document.querySelector('#password');
	const passwordToggle = document.querySelector('.password-toggle');

	if (!passwordInput || !passwordToggle) {
		return;
	}

	passwordToggle.addEventListener('click', () => {
		const isPasswordVisible = passwordInput.type === 'text';

		passwordInput.type = isPasswordVisible ? 'password' : 'text';
		passwordToggle.textContent = isPasswordVisible ? 'Show' : 'Hide';
		passwordToggle.setAttribute('aria-label', isPasswordVisible ? 'Show password' : 'Hide password');
		passwordToggle.setAttribute('aria-pressed', String(!isPasswordVisible));
	});
});
