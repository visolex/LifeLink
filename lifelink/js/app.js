document.addEventListener('DOMContentLoaded', () => {
	const menuToggle = document.querySelector('.menu-toggle');
	const navigationMenu = document.querySelector('.site-nav-menu');
	const navigationLinks = document.querySelectorAll('.site-nav-menu a');

	if (menuToggle && navigationMenu) {
		const closeMenu = () => {
			navigationMenu.classList.remove('is-open');
			menuToggle.setAttribute('aria-expanded', 'false');
			menuToggle.setAttribute('aria-label', 'Open navigation menu');
		};

		menuToggle.addEventListener('click', () => {
			const isOpen = navigationMenu.classList.toggle('is-open');
			menuToggle.setAttribute('aria-expanded', String(isOpen));
			menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
		});

		navigationLinks.forEach((link) => {
			link.addEventListener('click', closeMenu);
		});
	}

	document.querySelectorAll('.password-toggle').forEach((passwordToggle) => {
		const passwordInput = document.getElementById(passwordToggle.getAttribute('aria-controls'));

		if (!passwordInput) {
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

	const loginForm = document.querySelector('#login-form');
	const loginStatus = document.querySelector('#login-status');

	if (loginForm && loginStatus) {
		loginForm.addEventListener('submit', (event) => {
			event.preventDefault();

			if (!loginForm.checkValidity()) {
				loginForm.reportValidity();
				return;
			}

			loginStatus.textContent = 'Authentication will be connected soon.';
		});
	}

	const registerForm = document.querySelector('#register-form');
	const registerStatus = document.querySelector('#register-status');

	if (registerForm && registerStatus) {
		const fieldIds = ['full-name', 'email', 'phone', 'password', 'confirm-password', 'blood-group', 'location', 'availability'];
		const roleOptions = document.querySelectorAll('input[name="role"]');

		const clearErrors = () => {
			registerForm.querySelectorAll('.input-error').forEach((field) => field.classList.remove('input-error'));
			registerForm.querySelectorAll('.field-error').forEach((message) => {
				message.textContent = '';
			});
			registerForm.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
		};

		const showError = (fieldId, message) => {
			const field = document.getElementById(fieldId);
			const error = registerForm.querySelector(`[data-error-for="${fieldId}"]`);

			if (field) {
				field.classList.add('input-error');
				field.setAttribute('aria-invalid', 'true');
			}
			if (error) {
				error.textContent = message;
			}
		};

		roleOptions.forEach((roleOption) => {
			roleOption.addEventListener('change', () => {
				roleOptions.forEach((option) => {
					option.closest('.role-card')?.classList.toggle('is-selected', option.checked);
				});
				const roleOptionsGroup = document.getElementById('role-options');
				roleOptionsGroup?.removeAttribute('aria-invalid');
				const roleError = document.getElementById('role-error');
				if (roleError) {
					roleError.textContent = '';
				}
			});
		});

		registerForm.addEventListener('submit', (event) => {
			event.preventDefault();
			clearErrors();
			registerStatus.textContent = '';

			let isValid = true;
			let firstInvalidField = null;
			const markInvalid = (fieldId, message) => {
				showError(fieldId, message);
				isValid = false;
				firstInvalidField = firstInvalidField || document.getElementById(fieldId);
			};

			fieldIds.forEach((fieldId) => {
				const field = document.getElementById(fieldId);
				if (!field.value.trim()) {
					markInvalid(fieldId, 'This field is required.');
				}
			});

			const email = document.getElementById('email');
			if (email.value.trim() && !email.validity.valid) {
				markInvalid('email', 'Enter a valid email address.');
			}

			const phone = document.getElementById('phone');
			if (phone.value.trim() && (phone.value.match(/\d/g) || []).length < 7) {
				markInvalid('phone', 'Enter a phone number with at least 7 digits.');
			}

			const password = document.getElementById('password');
			if (password.value && password.value.length < 8) {
				markInvalid('password', 'Password must be at least 8 characters.');
			}

			const confirmPassword = document.getElementById('confirm-password');
			if (confirmPassword.value && password.value !== confirmPassword.value) {
				markInvalid('confirm-password', 'Passwords must match.');
			}

			const selectedRole = registerForm.querySelector('input[name="role"]:checked');
			if (!selectedRole) {
				showError('role-options', 'Select how you want to join.');
				document.getElementById('role-options')?.setAttribute('aria-invalid', 'true');
				isValid = false;
				firstInvalidField = firstInvalidField || roleOptions[0];
			}

			if (!isValid) {
				firstInvalidField?.focus();
				return;
			}

			registerStatus.textContent = 'Registration form validated. Firebase authentication will be connected next.';
		});
	}
});
