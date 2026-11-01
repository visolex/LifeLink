document.addEventListener('DOMContentLoaded', () => {
	const logoutButtons = document.querySelectorAll('#logout-button, [data-action="logout"]');

	logoutButtons.forEach((logoutButton) => {
		logoutButton.addEventListener('click', async () => {
			const originalLabel = logoutButton.textContent;
			logoutButton.disabled = true;
			logoutButton.textContent = 'Signing out...';

			try {
				const { auth } = await import('./firebase.js');
				const { signOut } = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js');
				await signOut(auth);
				window.location.href = new URL('../login.html', window.location.href).href;
			} catch (error) {
				console.error('Logout failed:', error);
				logoutButton.disabled = false;
				logoutButton.textContent = originalLabel;
				let status = document.getElementById('logout-status');
				if (!status) {
					status = document.createElement('p');
					status.id = 'logout-status';
					status.setAttribute('role', 'status');
					status.setAttribute('aria-live', 'polite');
					logoutButton.insertAdjacentElement('afterend', status);
				}
				if (status) {
					status.textContent = 'Unable to sign out. Please try again.';
					status.className = 'auth-status error';
				}
			}
		});
	});

	if (document.body.classList.contains('dashboard-page') && !document.querySelector('.site-footer')) {
		const footer = document.createElement('footer');
		footer.className = 'site-footer dashboard-footer';
		footer.innerHTML = '<div class="container"><strong>LifeLink</strong><span>Connecting people through meaningful blood donation.</span></div>';
		document.body.appendChild(footer);
	}

	if (document.body.classList.contains('dashboard-page') && !document.querySelector('.dashboard-topbar')) {
		const role = window.location.pathname.split('/').filter(Boolean).slice(-2, -1)[0] || 'donor';
		const navigation = {
			donor: [['Dashboard', 'dashboard.html'], ['Profile', 'profile.html'], ['Availability', 'availability.html'], ['Requests', 'requests.html'], ['History', 'history.html']],
			organizer: [['Dashboard', 'dashboard.html'], ['Create Request', 'create-request.html'], ['Find Donors', 'find-donors.html'], ['Requests', 'requests.html'], ['Reports', 'reports.html']],
			admin: [['Dashboard', 'dashboard.html'], ['Users', 'users.html'], ['Requests', 'requests.html'], ['Reports', 'reports.html']]
		};
		const topbar = document.createElement('nav');
		topbar.className = 'dashboard-topbar';
		topbar.setAttribute('aria-label', `${role} workspace navigation`);
		topbar.innerHTML = `<a class="brand" href="../index.html"><span class="brand-mark" aria-hidden="true">+</span><span>LifeLink</span></a><span class="dashboard-tagline">Connecting donors. Saving lives.</span><div class="dashboard-topbar-links">${(navigation[role] || navigation.donor).map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div><div class="dashboard-topbar-user"><span class="dashboard-user-name">Loading...</span><span class="dashboard-role-label">${role}</span><button class="button button-outline" data-action="logout" type="button">Logout</button></div>`;
		document.querySelector('.dashboard-main')?.prepend(topbar);
		topbar.querySelector('[data-action="logout"]')?.addEventListener('click', () => document.querySelector('#logout-button')?.click());
		loadDashboardUserName();
	}

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

	const registerForm = document.querySelector('#register-form');

	if (registerForm) {
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
				const donorFields = document.getElementById('donor-fields');
				const organizerFields = document.getElementById('organizer-fields');
				const isDonor = roleOption.value === 'donor' && roleOption.checked;
				if (donorFields) donorFields.hidden = !isDonor;
				if (organizerFields) organizerFields.hidden = isDonor;
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

		registerForm.addEventListener('input', () => {
			clearErrors();
		});
	}
});

async function loadDashboardUserName() {
	try {
		const { auth, db } = await import('./firebase.js');
		const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js');
		const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js');
		onAuthStateChanged(auth, async (user) => {
			if (!user) return;
			const snapshot = await getDoc(doc(db, 'users', user.uid));
			const name = snapshot.exists() ? snapshot.data().fullName : user.email;
			document.querySelectorAll('.dashboard-user-name').forEach((element) => { element.textContent = name || 'LifeLink user'; });
		});
	} catch (error) {
		console.error('Unable to load dashboard navigation profile:', error);
	}
}
