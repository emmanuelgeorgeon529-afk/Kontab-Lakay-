<!-- ===================== 4. OPERATIONS, SUPPLY CHAIN & GESTION DE STOCK ===================== -->
<section id="operations" class="view-section">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div>
            <h2 style="font-size:22px; font-weight:600;">Opérations, Supply Chain & Gestion de Stock</h2>
            <p style="color:var(--text-muted); font-size:13px; margin-top:4px;">Pwodwi, depo, pwodiksyon, acha & founisè</p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button style="background:var(--bg-white); color:var(--text-dark); border:1px solid #E2E8F0; padding:8px 16px; border-radius:8px; font-weight:600;">📥 Import Excel</button>
            <button onclick="VentesUI.openNewProductModal()" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600;">📦 Nouvo Pwodwi</button>
        </div>
    </div>

    <!-- Dashboard Visuel -->
    <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
        <div class="kpi-card"><div class="label">📦 Stock Total</div><div class="value" id="kpiOperationsStockTotal" style="color:var(--primary);">—</div></div>
        <div class="kpi-card"><div class="label">🏭 Produits</div><div class="value" id="kpiOperationsProduits">—</div></div>
        <div class="kpi-card"><div class="label">🚚 Founisè</div><div class="value" id="kpiOperationsFounise">—</div></div>
        <div class="kpi-card"><div class="label">🛒 Acha Mwa a</div><div class="value" id="kpiOperationsAchatMwa">—</div></div>
        <div class="kpi-card"><div class="label">⚠️ Alèt Stock</div><div class="value" id="kpiOperationsAlèt" style="color:var(--danger);">—</div></div>
        <div class="kpi-card"><div class="label">📈 Valè Envantè</div><div class="value" id="kpiOperationsValèEnvantè" style="color:var(--secondary);">—</div></div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <div class="chart-section"><div class="chart-header" style="display:flex; justify-content:space-between; margin-bottom:16px;"><h3 style="font-weight:600;">Évolution Stock</h3></div><div class="chart-container"><canvas id="stockChartEvolution"></canvas></div></div>
        <div class="chart-section"><div class="chart-header" style="display:flex; justify-content:space-between; margin-bottom:16px;"><h3 style="font-weight:600;">Achats Mensuels</h3></div><div class="chart-container"><canvas id="purchasesChart"></canvas></div></div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <div class="chart-section"><div class="chart-header" style="display:flex; justify-content:space-between; margin-bottom:16px;"><h3 style="font-weight:600;">Produits Plus Vendus</h3></div><div class="chart-container"><canvas id="topProductsChart"></canvas></div></div>
        <div class="chart-section"><div class="chart-header" style="display:flex; justify-content:space-between; margin-bottom:16px;"><h3 style="font-weight:600;">Répartition Catégories</h3></div><div class="chart-container"><canvas id="categoryDistributionChart"></canvas></div></div>
    </div>

    <!-- 4.1 Gestion des Produits -->
    <details class="chart-section" open style="padding:0; margin-top:8px;">
        <summary style="padding:20px; cursor:pointer; font-weight:600; font-size:16px; list-style:none;">📦 4.1 — Gestion des Produits</summary>
        <div style="padding:0 20px 20px; overflow-x:auto;">
            <table class="fin-table">
                <tr><th>SKU</th><th>Non</th><th>Catégorie</th><th>Prix Achat</th><th>Prix Vente</th><th>Unité</th></tr>
                <tbody id="operationsProduitsTableBody">
                    <tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">⏳ Chajman...</td></tr>
                </tbody>
            </table>
            <div style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap;">
                <button onclick="VentesUI.openNewProductModal()" style="background:var(--primary); color:white; border:none; padding:6px 14px; border-radius:8px; font-weight:600; font-size:13px;">➕ Ajouter</button>
                <button style="background:var(--bg-white); border:1px solid #E2E8F0; padding:6px 14px; border-radius:8px; font-weight:600; font-size:13px;">📥 Import Excel</button>
            </div>
        </div>
    </details>

    <!-- 4.2 Gestion de Stock -->
    <details class="chart-section" open style="padding:0; margin-top:16px;">
        <summary style="padding:20px; cursor:pointer; font-weight:600; font-size:16px; list-style:none;">📊 4.2 — Gestion de Stock</summary>
        <div style="padding:0 20px 20px;">
            <div class="kpi-grid" style="grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); margin-bottom:14px;">
                <div class="kpi-card"><div class="label">Valeur Totale</div><div class="value" id="kpiStockValèTotal">—</div></div>
                <div class="kpi-card"><div class="label">Disponibles</div><div class="value" id="kpiStockDisponib" style="color:var(--secondary);">—</div></div>
                <div class="kpi-card"><div class="label">Faibles</div><div class="value" id="kpiStockFèb" style="color:#B45309;">—</div></div>
                <div class="kpi-card"><div class="label">Épuisés</div><div class="value" id="kpiStockEpwize" style="color:var(--danger);">—</div></div>
            </div>
            <table class="fin-table">
                <tr><th>Produit</th><th>Quantité</th><th>Min Stock</th><th>Statut</th><th></th></tr>
                <tbody id="stockTableBody">
                    <tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">⏳ Chajman...</td></tr>
                </tbody>
            </table>
        </div>
    </details>

    <!-- 4.3 Multi-Dépôts -->
    <details class="chart-section" style="padding:0; margin-top:16px;">
        <summary style="padding:20px; cursor:pointer; font-weight:600; font-size:16px; list-style:none;">🏢 4.3 — Multi-Dépôts</summary>
        <div style="padding:0 20px 20px;">
            <p style="color:var(--text-muted); font-size:13px; margin-bottom:12px;">⚠️ Fonksyon sa a poko konekte — kounye a chak pwodwi gen yon sèl kantite stock global, pa yon kantite pa depo.</p>
            <table class="fin-table">
                <tr><th>Dépôt</th><th>Adresse</th><th>Responsable</th></tr>
                <tr><td>Dépôt Principal</td><td>Delmas 33</td><td>Pierre A.</td></tr>
                <tr><td>Magasin Centre-Ville</td><td>Rue du Centre</td><td>Marie L.</td></tr>
                <tr><td>Entrepôt Nord</td><td>Cap-Haïtien</td><td>Jean D.</td></tr>
                <tr><td>Succursale Ouest</td><td>Pétion-Ville</td><td>Rose M.</td></tr>
            </table>
        </div>
    </details>

    <!-- 4.4 Production -->
    <details class="chart-section" style="padding:0; margin-top:16px;">
        <summary style="padding:20px; cursor:pointer; font-weight:600; font-size:16px; list-style:none;">🏭 4.4 — Production</summary>
        <div style="padding:0 20px 20px;">
            <p style="color:var(--text-muted); font-size:13px; margin-bottom:12px;">⚠️ Fonksyon sa a poko konekte — pa gen sèvis backend pou nomenclature/BOM ni Ordres de Fabrication.</p>
            <p style="font-size:13px; font-weight:600; margin-bottom:8px;">Nomenclature (BOM) — Egzanp</p>
            <table class="fin-table">
                <tr><th>Matière Première</th><th>Quantité Requise</th></tr>
                <tr><td>Charbon actif</td><td style="text-align:right;">2 kg</td></tr>
                <tr><td>Huile de coco</td><td style="text-align:right;">1 L</td></tr>
            </table>
        </div>
    </details>

    <!-- 4.5 Gestion des Achats -->
    <details class="chart-section" open style="padding:0; margin-top:16px;">
        <summary style="padding:20px; cursor:pointer; font-weight:600; font-size:16px; list-style:none;">🛒 4.5 — Gestion des Achats</summary>
        <div style="padding:0 20px 20px; overflow-x:auto;">
            <table class="fin-table">
                <tr><th>N° Acha</th><th>Founisè</th><th>Total</th><th>Estati</th></tr>
                <tbody id="achatTableBody">
                    <tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">⏳ Chajman...</td></tr>
                </tbody>
            </table>
            <div style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap;">
                <button onclick="OperationsUI.openNewPurchaseModal()" style="background:var(--primary); color:white; border:none; padding:6px 14px; border-radius:8px; font-weight:600; font-size:13px;">➕ Nouvo Acha</button>
            </div>
        </div>
    </details>

    <!-- 4.6 Fournisseurs -->
    <details class="chart-section" open style="padding:0; margin-top:16px;">
        <summary style="padding:20px; cursor:pointer; font-weight:600; font-size:16px; list-style:none;">🚚 4.6 — Fournisseurs</summary>
        <div style="padding:0 20px 20px; overflow-x:auto;">
            <table class="fin-table">
                <tr><th>Founisè</th><th>Telefòn</th><th>Solde Dû</th></tr>
                <tbody id="founisèTableBody">
                    <tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:20px;">⏳ Chajman...</td></tr>
                </tbody>
            </table>
            <div style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap;">
                <button onclick="OperationsUI.openNewSupplierModal()" style="background:var(--primary); color:white; border:none; padding:6px 14px; border-radius:8px; font-weight:600; font-size:13px;">➕ Nouvo Founisè</button>
            </div>
        </div>
    </details>

    <!-- 4.7 Prévisions de Stock -->
    <details class="chart-section" style="padding:0; margin-top:16px;">
        <summary style="padding:20px; cursor:pointer; font-weight:600; font-size:16px; list-style:none;">📈 4.7 — Prévisions de Stock</summary>
        <div style="padding:0 20px 20px;">
            <p style="color:var(--text-muted); font-size:13px;">⚠️ Fonksyon sa a poko konekte — mande analiz done istorik vant pou prevwa.</p>
        </div>
    </details>

    <!-- ===================== MODAL: NOUVO FOUNISÈ ===================== -->
    <div id="newSupplierModal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.5); z-index:1000; align-items:center; justify-content:center; padding:16px;">
        <div style="background:white; border-radius:16px; width:100%; max-width:380px; max-height:90vh; overflow-y:auto; padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="font-size:18px; font-weight:700;">🚚 Nouvo Founisè</h3>
                <span onclick="OperationsUI.closeNewSupplierModal()" style="cursor:pointer; font-size:20px; color:var(--text-muted);">✕</span>
            </div>
            <div id="newSupplierError" style="display:none; background:#FEE2E2; color:#B91C1C; padding:10px; border-radius:8px; font-size:13px; margin-bottom:14px;"></div>

            <label style="font-size:12px; color:var(--text-muted); display:block; margin-bottom:4px;">Non *</label>
            <input type="text" id="suppNon" class="settings-input" style="margin-bottom:12px;" placeholder="Non founisè oswa antrepriz">

            <label style="font-size:12px; color:var(--text-muted); display:block; margin-bottom:4px;">Telefòn</label>
            <input type="tel" id="suppTelefòn" class="settings-input" style="margin-bottom:12px;" placeholder="+509 ....">

            <label style="font-size:12px; color:var(--text-muted); display:block; margin-bottom:4px;">Adrès</label>
            <input type="text" id="suppAdrès" class="settings-input" style="margin-bottom:20px;">

            <button id="suppSubmitBtn" onclick="OperationsUI.submitNewSupplier()" style="width:100%; background:var(--primary); color:white; border:none; padding:12px; border-radius:10px; font-weight:700; font-size:14px;">✅ Kreye Founisè</button>
        </div>
    </div>

    <!-- ===================== MODAL: NOUVO ACHA ===================== -->
    <div id="newPurchaseModal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.5); z-index:1000; align-items:center; justify-content:center; padding:16px;">
        <div style="background:white; border-radius:16px; width:100%; max-width:420px; max-height:90vh; overflow-y:auto; padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="font-size:18px; font-weight:700;">📦 Nouvo Acha</h3>
                <span onclick="OperationsUI.closeNewPurchaseModal()" style="cursor:pointer; font-size:20px; color:var(--text-muted);">✕</span>
            </div>
            <div id="newPurchaseError" style="display:none; background:#FEE2E2; color:#B91C1C; padding:10px; border-radius:8px; font-size:13px; margin-bottom:14px;"></div>

            <label style="font-size:12px; color:var(--text-muted); display:block; margin-bottom:4px;">Founisè</label>
            <select id="achatFounisèSelect" class="settings-input" style="margin-bottom:4px;">
                <option value="">— Chwazi founisè —</option>
            </select>
            <a onclick="OperationsUI.openNewSupplierModal()" style="font-size:12px; color:var(--primary); cursor:pointer; display:inline-block; margin-bottom:14px;">➕ Nouvo Founisè</a>

            <label style="font-size:12px; color:var(--text-muted); display:block; margin-bottom:4px;">Pwodwi</label>
            <select id="achatPwodwiSelect" class="settings-input" style="margin-bottom:14px;">
                <option value="">— Chwazi pwodwi —</option>
            </select>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
                <div>
                    <label style="font-size:12px; color:var(--text-muted); display:block; margin-bottom:4px;">Kantite</label>
                    <input type="number" id="achatKantite" class="settings-input" value="1" min="1">
                </div>
                <div>
                    <label style="font-size:12px; color:var(--text-muted); display:block; margin-bottom:4px;">Pri Inite (HTG)</label>
                    <input type="number" id="achatPriInite" class="settings-input" value="0" min="0">
                </div>
            </div>

            <label style="font-size:12px; color:var(--text-muted); display:block; margin-bottom:4px;">Rabais (%) — opsyonèl</label>
            <input type="number" id="achatRabaisPousantaj" class="settings-input" value="0" min="0" max="100" style="margin-bottom:14px;">

            <button onclick="OperationsUI.addItemToPurchaseCart()" style="width:100%; background:var(--bg-white); border:1px solid #E2E8F0; padding:8px; border-radius:8px; font-weight:600; font-size:13px; margin-bottom:14px;">➕ Ajoute nan Panye</button>

            <div id="achatPanyeList" style="margin-bottom:14px; font-size:13px;"></div>
            <div style="text-align:right; font-weight:700; margin-bottom:14px;">Total: <span id="achatPanyeTotal">0</span> HTG</div>

            <label style="font-size:12px; color:var(--text-muted); display:block; margin-bottom:4px;">Frè Accessoires (transpò, dwàn — opsyonèl)</label>
            <input type="number" id="achatFraisAccessoires" class="settings-input" value="0" min="0" style="margin-bottom:14px;">

            <label style="font-size:12px; color:var(--text-muted); display:block; margin-bottom:4px;">Mòd Peman</label>
            <select id="achatMòdPeman" class="settings-input" style="margin-bottom:20px;">
                <option value="kach">Kach</option>
                <option value="transfè">Transfè Bank</option>
                <option value="kredi">Kredi (Dèt Founisè)</option>
            </select>

            <button id="achatSubmitBtn" onclick="OperationsUI.submitNewPurchase()" style="width:100%; background:var(--primary); color:white; border:none; padding:12px; border-radius:10px; font-weight:700; font-size:14px;">✅ Konfime Acha</button>
        </div>
    </div>
</section>
