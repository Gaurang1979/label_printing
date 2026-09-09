(function () {
    const routes = [
        ['Label Templates', 'List/Label Template'],
        ['Printers', 'List/Manage Printer'],
        ['Print Jobs', 'List/Label Print Job'],
        ['Print Logs', 'List/Label Print Log'],
        ['Design Objects', 'List/Label Template Object'],
        ['Job Items', 'List/Label Print Job Item'],
        ['Label Designer', 'label-designer']
    ];
    const doctypes = new Set(['Label Template','Label Template Object','Manage Printer','Label Print Job','Label Print Job Item','Label Print Log']);

    function add_sidebar() {
        const route = frappe.get_route ? frappe.get_route() : [];
        const current = route && route[0] === 'Form' ? route[1] : '';
        if (!doctypes.has(current)) return;
        const side = document.querySelector('.layout-side-section');
        if (!side || side.querySelector('.lp-module-sidebar')) return;
        const box = document.createElement('div');
        box.className = 'lp-module-sidebar';
        box.innerHTML = '<div class="lp-module-sidebar-title">Label Printing</div>' + routes.map(r => `<a href="#" data-lp-route="${frappe.utils.escape_html(r[1])}">${frappe.utils.escape_html(r[0])}</a>`).join('');
        side.appendChild(box);
        box.addEventListener('click', function (e) {
            const link = e.target.closest('[data-lp-route]');
            if (!link) return;
            e.preventDefault();
            const target = link.getAttribute('data-lp-route');
            if (target === 'label-designer') frappe.set_route(target);
            else frappe.set_route(target.split('/'));
        });
    }

    if (frappe.router && frappe.router.on) frappe.router.on('change', () => setTimeout(add_sidebar, 150));
    $(document).on('page-change', () => setTimeout(add_sidebar, 150));
    setTimeout(add_sidebar, 500);
})();
