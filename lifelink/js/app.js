document.addEventListener('DOMContentLoaded', () => {
	const menuToggle = document.querySelector('.menu-toggle');
	const navigationMenu = document.querySelector('.site-nav-menu');
	const navigationLinks = document.querySelectorAll('.site-nav-menu a');

	if (!menuToggle || !navigationMenu) {
		return;
	}

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
});
