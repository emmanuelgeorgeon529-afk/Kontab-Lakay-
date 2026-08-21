// js/core/componentLoader.js
// Chaje componant HTML yo (sidebar, header, footer, topbar) dinamikman
// Itilizasyon: yon sèl fonksyon reyisabl pou tout componant layout yo

(function () {
    async function loadComponent(targetSelector, url) {
        const target = document.querySelector(targetSelector);
        if (!target) {
            console.warn(`componentLoader: pa jwenn ${targetSelector}`);
            return;
        }
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`${url} pa chaje (${response.status})`);
            const html = await response.text();
            target.outerHTML = html;
        } catch (err) {
            console.error('componentLoader erè:', err);
        }
    }

    async function loadAllComponents(componentMap) {
        // Chaje yo tout an paralèl pou pi vit
        await Promise.all(
            componentMap.map(({ selector, url }) => loadComponent(selector, url))
        );
        // Evènman pou lòt script konnen componant yo pare
        document.dispatchEvent(new Event('components:loaded'));
    }

    window.loadAllComponents = loadAllComponents;
})();
