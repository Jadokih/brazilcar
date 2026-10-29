/**
 * Brazil Car — Locadora de Veículos (Nova Serrana–MG)
 * Lógica de catálogo, filtros, busca, galeria modal e integração com WhatsApp.
 */

(function () {
  'use strict';

  const WHATSAPP_NUMBER = '553796652007';
  const GENERAL_WHATSAPP_MSG =
    'Olá! Gostaria de conhecer as opções de veículos para alugar na Brazil Car.';

  const catalogData = window.BRAZIL_CAR_DATA || {
    categoriasDisponiveis: [
      'Todos',
      'Automáticos',
      'Econômicos',
      'Trabalho',
      'Viagem',
      'Família',
      'Manuais',
      'Mais espaço'
    ],
    veiculos: []
  };

  const vehicles = Array.isArray(catalogData.veiculos) ? catalogData.veiculos : [];
  const categories = Array.isArray(catalogData.categoriasDisponiveis)
    ? catalogData.categoriasDisponiveis
    : ['Todos'];

  // Estado atual dos filtros e modal
  const state = {
    activeCategory: 'Todos',
    searchQuery: '',
    currentModalVehicle: null,
    currentPhotoIndex: 0
  };

  // Elementos do DOM
  const menuToggle = document.getElementById('menuToggle');
  const primaryNav = document.getElementById('primaryNav');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const filterChipsContainer = document.getElementById('filterChips');
  const resetFiltersInlineBtn = document.getElementById('resetFiltersInlineBtn');
  const resultsStatus = document.getElementById('resultsStatus');
  const catalogGrid = document.getElementById('catalogGrid');
  const emptyState = document.getElementById('emptyState');
  const emptyStateTitle = document.getElementById('emptyStateTitle');
  const emptyStateText = document.getElementById('emptyStateText');
  const emptyResetBtn = document.getElementById('emptyResetBtn');

  // Elementos da Vitrine Hero
  const heroShowcaseTag = document.getElementById('heroShowcaseTag');
  const heroShowcaseBadge = document.getElementById('heroShowcaseBadge');
  const heroShowcaseImg = document.getElementById('heroShowcaseImg');
  const heroShowcaseBrand = document.getElementById('heroShowcaseBrand');
  const heroShowcaseTitle = document.getElementById('heroShowcaseTitle');
  const heroShowcasePrice = document.getElementById('heroShowcasePrice');
  const heroShowcaseDetailsBtn = document.getElementById('heroShowcaseDetailsBtn');
  const showcaseThumbs = document.querySelectorAll('.showcase-thumb');

  // Elementos do Modal (<dialog>)
  const vehicleModal = document.getElementById('vehicleModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalBackCatalogBtn = document.getElementById('modalBackCatalogBtn');
  const modalBrandBadge = document.getElementById('modalBrandBadge');
  const modalVehicleTitle = document.getElementById('modalVehicleTitle');
  const modalMainPhoto = document.getElementById('modalMainPhoto');
  const galleryControls = document.getElementById('galleryControls');
  const galleryPrevBtn = document.getElementById('galleryPrevBtn');
  const galleryNextBtn = document.getElementById('galleryNextBtn');
  const galleryCounter = document.getElementById('galleryCounter');
  const modalThumbnails = document.getElementById('modalThumbnails');
  const modalPriceCard = document.getElementById('modalPriceCard');
  const modalPriceRow = document.getElementById('modalPriceRow');
  const modalSpecsGrid = document.getElementById('modalSpecsGrid');
  const modalRawSection = document.getElementById('modalRawSection');
  const modalRawText = document.getElementById('modalRawText');
  const modalCategoriesSection = document.getElementById('modalCategoriesSection');
  const modalCategoryTags = document.getElementById('modalCategoryTags');
  const modalWhatsappBtn = document.getElementById('modalWhatsappBtn');

  /**
   * Utilitários de formatação e URLs
   */
  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function getVehicleFullName(vehicle) {
    if (!vehicle) return 'veículo';
    return vehicle.ano ? `${vehicle.nome} ${vehicle.ano}` : vehicle.nome;
  }

  function buildWhatsappUrl(message) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  function buildVehicleWhatsappUrl(vehicle) {
    const label = getVehicleFullName(vehicle);
    const msg = `Olá! Vi o ${label} no catálogo da Brazil Car e gostaria de saber mais sobre os valores e a disponibilidade para locação.`;
    return buildWhatsappUrl(msg);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Menu Mobile
   */
  function closeMobileMenu() {
    if (!menuToggle || !primaryNav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    primaryNav.classList.remove('is-open');
  }

  function initMobileMenu() {
    if (!menuToggle || !primaryNav) return;

    menuToggle.addEventListener('click', () => {
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!expanded));
      primaryNav.classList.toggle('is-open', !expanded);
    });

    primaryNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMobileMenu);
    });

    document.addEventListener('click', (event) => {
      if (
        primaryNav.classList.contains('is-open') &&
        !primaryNav.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        closeMobileMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && primaryNav.classList.contains('is-open')) {
        closeMobileMenu();
        menuToggle.focus();
      }
    });
  }

  /**
   * Vitrine interativa na Hero
   */
  function updateHeroShowcase(index) {
    const vehicle = vehicles[index];
    if (!vehicle) return;

    const fullName = getVehicleFullName(vehicle);

    if (heroShowcaseTag) {
      heroShowcaseTag.textContent = vehicle.ano
        ? `Destaque da frota · Ano ${vehicle.ano}`
        : 'Frota Brazil Car · Nova Serrana–MG';
    }

    if (heroShowcaseBadge) {
      if (vehicle.transmissao) {
        heroShowcaseBadge.textContent = vehicle.transmissao;
        heroShowcaseBadge.hidden = false;
      } else {
        heroShowcaseBadge.textContent = 'Sob consulta';
        heroShowcaseBadge.hidden = false;
      }
    }

    if (heroShowcaseImg && vehicle.imagemCapa) {
      heroShowcaseImg.src = vehicle.imagemCapa;
      heroShowcaseImg.alt = vehicle.altFoto || `Foto do veículo ${fullName}`;
    }

    if (heroShowcaseBrand) {
      heroShowcaseBrand.textContent = vehicle.marca || 'Brazil Car';
    }

    if (heroShowcaseTitle) {
      heroShowcaseTitle.textContent = fullName;
    }

    if (heroShowcasePrice) {
      if (vehicle.precoFormatado) {
        const unit = vehicle.unidadeCobranca ? ` / ${vehicle.unidadeCobranca}` : '';
        heroShowcasePrice.innerHTML = `<strong>${escapeHtml(vehicle.precoFormatado)}</strong> <span>${escapeHtml(unit)}</span>`;
      } else {
        heroShowcasePrice.innerHTML = `<strong>Valor sob consulta</strong> <span>pelo WhatsApp</span>`;
      }
    }

    if (heroShowcaseDetailsBtn) {
      heroShowcaseDetailsBtn.setAttribute('data-vehicle-id', vehicle.id);
    }

    showcaseThumbs.forEach((btn, idx) => {
      const isCurrent = idx === index;
      btn.classList.toggle('active', isCurrent);
      btn.setAttribute('aria-pressed', String(isCurrent));
    });
  }

  function initHeroShowcase() {
    showcaseThumbs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-showcase-index')) || 0;
        updateHeroShowcase(idx);
      });
    });

    if (heroShowcaseDetailsBtn) {
      heroShowcaseDetailsBtn.addEventListener('click', () => {
        const id = heroShowcaseDetailsBtn.getAttribute('data-vehicle-id');
        const found = vehicles.find((v) => v.id === id) || vehicles[0];
        if (found) openVehicleModal(found);
      });
    }
  }

  /**
   * Filtragem e Busca
   */
  function matchesCategory(vehicle, category) {
    if (!category || category === 'Todos') return true;
    return Array.isArray(vehicle.categorias) && vehicle.categorias.includes(category);
  }

  function matchesSearch(vehicle, query) {
    const q = normalizeText(query);
    if (!q) return true;

    const searchableFields = [
      vehicle.nome,
      vehicle.marca,
      vehicle.modelo,
      vehicle.versao,
      vehicle.ano,
      vehicle.transmissao,
      vehicle.carroceria,
      ...(Array.isArray(vehicle.categorias) ? vehicle.categorias : [])
    ];

    const combined = normalizeText(searchableFields.filter(Boolean).join(' '));
    return combined.includes(q);
  }

  function getFilteredVehicles() {
    return vehicles.filter(
      (v) => matchesCategory(v, state.activeCategory) && matchesSearch(v, state.searchQuery)
    );
  }

  function getCategoryCount(category) {
    return vehicles.filter(
      (v) => matchesCategory(v, category) && matchesSearch(v, state.searchQuery)
    ).length;
  }

  function renderFilterChips() {
    if (!filterChipsContainer) return;

    filterChipsContainer.innerHTML = categories
      .map((cat) => {
        const isActive = state.activeCategory === cat;
        const count = getCategoryCount(cat);
        return `
          <button
            type="button"
            class="filter-chip"
            data-category="${escapeHtml(cat)}"
            aria-pressed="${isActive ? 'true' : 'false'}"
          >
            <span>${escapeHtml(cat)}</span>
            <span class="chip-count" aria-label="${count} veículos">${count}</span>
          </button>
        `;
      })
      .join('');

    filterChipsContainer.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const selected = chip.getAttribute('data-category') || 'Todos';
        state.activeCategory = selected;
        updateCatalogView();
      });
    });
  }

  /**
   * Renderização dos Cards de Veículos
   */
  function buildVehicleCardHtml(vehicle, index) {
    const fullName = getVehicleFullName(vehicle);
    const whatsappHref = buildVehicleWhatsappUrl(vehicle);
    const lazyAttr = index >= 4 ? 'loading="lazy"' : '';

    // Badges superiores da imagem (somente com informações reais)
    const brandBadge = vehicle.marca
      ? `<span class="badge badge-brand">${escapeHtml(vehicle.marca)}</span>`
      : '<span></span>';

    const rightBadge = vehicle.ano
      ? `<span class="badge badge-year">Ano ${escapeHtml(vehicle.ano)}</span>`
      : `<span class="badge badge-consult">Sob consulta</span>`;

    // Lista de atributos documentados (omite campos ausentes em vez de inventar)
    const specItems = [];
    if (vehicle.ano) {
      specItems.push(`<li class="spec-pill">Ano ${escapeHtml(vehicle.ano)}</li>`);
    }
    if (vehicle.transmissao) {
      specItems.push(`<li class="spec-pill">Câmbio ${escapeHtml(vehicle.transmissao)}</li>`);
    }
    if (vehicle.lugares) {
      specItems.push(`<li class="spec-pill">${escapeHtml(vehicle.lugares)}</li>`);
    }
    if (Array.isArray(vehicle.caracteristicasExtras)) {
      vehicle.caracteristicasExtras.forEach((extra) => {
        specItems.push(`<li class="spec-pill">${escapeHtml(extra)}</li>`);
      });
    }

    if (specItems.length === 0) {
      specItems.push(
        `<li class="spec-pill spec-pill-muted">Especificações e condições sob consulta</li>`
      );
    }

    // Bloco de preço conforme arquivo .txt
    let priceBoxHtml = '';
    if (vehicle.precoFormatado) {
      const unitText = vehicle.unidadeCobranca ? vehicle.unidadeCobranca : '';
      priceBoxHtml = `
        <div class="card-price-box">
          <span class="price-label">Locação</span>
          <div class="price-value-group">
            <strong class="price-amount">${escapeHtml(vehicle.precoFormatado)}</strong>
            ${unitText ? `<span class="price-unit">${escapeHtml(unitText)}</span>` : ''}
          </div>
        </div>
      `;
    } else {
      priceBoxHtml = `
        <div class="card-price-box is-consult">
          <span class="price-label">Locação</span>
          <div class="price-value-group">
            <strong class="price-amount">Valor sob consulta</strong>
          </div>
        </div>
      `;
    }

    const subtitleParts = [];
    if (vehicle.marca) subtitleParts.push(vehicle.marca);
    if (vehicle.modelo) subtitleParts.push(`Modelo ${vehicle.modelo}`);
    if (vehicle.versao) subtitleParts.push(vehicle.versao);

    return `
      <article class="vehicle-card" data-vehicle-id="${escapeHtml(vehicle.id)}">
        <div
          class="card-media"
          role="button"
          tabindex="0"
          data-open-details="${escapeHtml(vehicle.id)}"
          aria-label="Ver fotos e detalhes de ${escapeHtml(fullName)}"
        >
          <div class="card-badges-top">
            ${brandBadge}
            ${rightBadge}
          </div>
          <img
            src="${escapeHtml(vehicle.imagemCapa)}"
            alt="${escapeHtml(vehicle.altFoto || `Foto de ${fullName}`)}"
            class="card-photo"
            width="650"
            height="406"
            ${lazyAttr}
          >
        </div>

        <div class="card-body">
          <div class="card-header-group">
            <p class="card-subtitle">${escapeHtml(subtitleParts.join(' · '))}</p>
            <h3 class="card-title">
              <button
                type="button"
                class="card-title-btn"
                data-open-details="${escapeHtml(vehicle.id)}"
              >
                ${escapeHtml(fullName)}
              </button>
            </h3>
          </div>

          <ul class="card-specs" aria-label="Características informadas">
            ${specItems.join('')}
          </ul>

          ${priceBoxHtml}

          <div class="card-actions">
            <a
              href="${escapeHtml(whatsappHref)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-whatsapp"
            >
              <svg class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.03 2C6.5 2 2.01 6.49 2.01 12.01c0 1.77.46 3.49 1.34 5.01L2 22l5.12-1.34c1.47.8 3.13 1.22 4.91 1.22 5.53 0 10.02-4.49 10.02-10.01S17.56 2 12.03 2zm5.85 14.15c-.24.69-1.4 1.32-1.95 1.4-.51.08-1.16.11-1.88-.12-.44-.14-1-.33-1.71-.64-3-1.3-4.96-4.33-5.11-4.53-.15-.2-1.22-1.62-1.22-3.09 0-1.47.77-2.19 1.04-2.49.27-.3.6-.37.8-.37.2 0 .4 0 .57.01.18.01.43-.07.67.51.25.6.84 2.06.91 2.21.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.31.39-.45.53-.15.15-.3.31-.13.61.18.3.78 1.29 1.68 2.09 1.15 1.03 2.12 1.35 2.42 1.5.3.15.48.13.65-.08.18-.2.75-.88.95-1.18.2-.3.4-.25.68-.15.28.1 1.76.83 2.06.98.3.15.5.23.58.35.07.13.07.73-.17 1.42z"/>
              </svg>
              <span>Consultar pelo WhatsApp</span>
            </a>

            <button
              type="button"
              class="btn btn-secondary"
              data-open-details="${escapeHtml(vehicle.id)}"
            >
              Ver detalhes
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function updateCatalogView() {
    renderFilterChips();

    const filtered = getFilteredVehicles();
    const hasActiveFilter = state.activeCategory !== 'Todos' || state.searchQuery.trim() !== '';

    if (resetFiltersInlineBtn) {
      resetFiltersInlineBtn.hidden = !hasActiveFilter;
    }

    if (clearSearchBtn) {
      clearSearchBtn.hidden = state.searchQuery.trim() === '';
    }

    if (resultsStatus) {
      const total = vehicles.length;
      const shown = filtered.length;
      if (!hasActiveFilter) {
        resultsStatus.textContent = `Exibindo ${shown} ${shown === 1 ? 'veículo disponível' : 'veículos disponíveis'} no catálogo`;
      } else {
        resultsStatus.textContent = `${shown} de ${total} ${total === 1 ? 'veículo encontrado' : 'veículos encontrados'}`;
      }
    }

    if (filtered.length === 0) {
      if (catalogGrid) {
        catalogGrid.innerHTML = '';
        catalogGrid.hidden = true;
      }
      if (emptyState) {
        emptyState.hidden = false;
        if (state.searchQuery.trim() && state.activeCategory !== 'Todos') {
          emptyStateTitle.textContent = `Nenhum resultado para "${state.searchQuery.trim()}" em "${state.activeCategory}"`;
        } else if (state.searchQuery.trim()) {
          emptyStateTitle.textContent = `Nenhum veículo encontrado para "${state.searchQuery.trim()}"`;
        } else {
          emptyStateTitle.textContent = `Nenhum veículo documentado na categoria "${state.activeCategory}"`;
        }
        emptyStateText.textContent =
          'Somente classificamos veículos quando a característica está confirmada nos arquivos do catálogo. Limpe os filtros para visualizar a frota completa ou consulte diretamente pelo WhatsApp.';
      }
      return;
    }

    if (emptyState) {
      emptyState.hidden = true;
    }

    if (catalogGrid) {
      catalogGrid.hidden = false;
      catalogGrid.innerHTML = filtered.map(buildVehicleCardHtml).join('');

      catalogGrid.querySelectorAll('[data-open-details]').forEach((el) => {
        el.addEventListener('click', () => {
          const vehicleId = el.getAttribute('data-open-details');
          const vehicle = vehicles.find((v) => v.id === vehicleId);
          if (vehicle) openVehicleModal(vehicle);
        });

        if (el.tagName !== 'BUTTON') {
          el.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              const vehicleId = el.getAttribute('data-open-details');
              const vehicle = vehicles.find((v) => v.id === vehicleId);
              if (vehicle) openVehicleModal(vehicle);
            }
          });
        }
      });
    }
  }

  function resetAllFilters() {
    state.activeCategory = 'Todos';
    state.searchQuery = '';
    if (searchInput) searchInput.value = '';
    updateCatalogView();
  }

  /**
   * Modal de Detalhes e Galeria (<dialog closedby="any">)
   */
  function updateModalGalleryPhoto() {
    const vehicle = state.currentModalVehicle;
    if (!vehicle) return;

    const photos = Array.isArray(vehicle.imagens) && vehicle.imagens.length > 0
      ? vehicle.imagens
      : [vehicle.imagemCapa];

    const total = photos.length;
    const index = ((state.currentPhotoIndex % total) + total) % total;
    state.currentPhotoIndex = index;

    const fullName = getVehicleFullName(vehicle);
    if (modalMainPhoto) {
      modalMainPhoto.src = photos[index];
      modalMainPhoto.alt = `${vehicle.altFoto || fullName} — Foto ${index + 1} de ${total}`;
    }

    if (galleryControls) {
      galleryControls.hidden = total <= 1;
    }
    if (galleryCounter) {
      galleryCounter.textContent = `${index + 1} / ${total}`;
    }

    if (modalThumbnails) {
      if (total <= 1) {
        modalThumbnails.hidden = true;
        modalThumbnails.innerHTML = '';
      } else {
        modalThumbnails.hidden = false;
        modalThumbnails.innerHTML = photos
          .map(
            (src, idx) => `
            <button
              type="button"
              class="modal-thumb-btn ${idx === index ? 'active' : ''}"
              data-photo-idx="${idx}"
              aria-label="Selecionar foto ${idx + 1}"
            >
              <img src="${escapeHtml(src)}" alt="Miniatura ${idx + 1}" loading="lazy">
            </button>
          `
          )
          .join('');

        modalThumbnails.querySelectorAll('.modal-thumb-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            state.currentPhotoIndex = Number(btn.getAttribute('data-photo-idx')) || 0;
            updateModalGalleryPhoto();
          });
        });
      }
    }
  }

  function openVehicleModal(vehicle, updateHash = true) {
    if (!vehicle || !vehicleModal) return;

    state.currentModalVehicle = vehicle;
    state.currentPhotoIndex = 0;

    const fullName = getVehicleFullName(vehicle);

    if (modalBrandBadge) {
      modalBrandBadge.textContent = vehicle.marca || 'Brazil Car';
    }
    if (modalVehicleTitle) {
      modalVehicleTitle.textContent = fullName;
    }

    updateModalGalleryPhoto();

    // Preço no Modal
    if (modalPriceCard && modalPriceRow) {
      if (vehicle.precoFormatado) {
        modalPriceCard.classList.remove('is-consult');
        modalPriceRow.innerHTML = `
          <strong class="modal-price-amount">${escapeHtml(vehicle.precoFormatado)}</strong>
          ${vehicle.unidadeCobranca ? `<span class="modal-price-unit">${escapeHtml(vehicle.unidadeCobranca)}</span>` : ''}
        `;
      } else {
        modalPriceCard.classList.add('is-consult');
        modalPriceRow.innerHTML = `
          <strong class="modal-price-amount">Valor sob consulta</strong>
          <span class="modal-price-unit">Consulte pelo WhatsApp</span>
        `;
      }
    }

    // Especificações registradas (somente campos realmente existentes)
    if (modalSpecsGrid) {
      const specs = [];
      if (vehicle.marca) {
        specs.push({ label: 'Marca', value: vehicle.marca });
      }
      if (vehicle.modelo) {
        specs.push({ label: 'Modelo', value: vehicle.modelo });
      }
      if (vehicle.versao) {
        specs.push({ label: 'Versão', value: vehicle.versao });
      }
      if (vehicle.ano) {
        specs.push({ label: 'Ano', value: vehicle.ano });
      }
      if (vehicle.transmissao) {
        specs.push({ label: 'Transmissão', value: vehicle.transmissao });
      }
      if (vehicle.lugares) {
        specs.push({ label: 'Lugares', value: vehicle.lugares });
      }
      if (vehicle.unidadeCobranca && vehicle.precoFormatado) {
        specs.push({
          label: 'Modalidade',
          value: `${vehicle.precoFormatado} (${vehicle.unidadeCobranca})`
        });
      }

      modalSpecsGrid.innerHTML = specs
        .map(
          (s) => `
          <div class="modal-spec-item">
            <dt>${escapeHtml(s.label)}</dt>
            <dd>${escapeHtml(s.value)}</dd>
          </div>
        `
        )
        .join('');
    }

    // Texto original do arquivo .txt
    if (modalRawSection && modalRawText) {
      if (vehicle.textoOriginal) {
        modalRawSection.hidden = false;
        modalRawText.textContent = vehicle.textoOriginal;
      } else {
        modalRawSection.hidden = false;
        modalRawText.textContent =
          'Descrição detalhada e tarifa em atualização. Consulte valores e condições diretamente pelo WhatsApp.';
      }
    }

    // Categorias compatíveis
    if (modalCategoriesSection && modalCategoryTags) {
      if (Array.isArray(vehicle.categorias) && vehicle.categorias.length > 0) {
        modalCategoriesSection.hidden = false;
        modalCategoryTags.innerHTML = vehicle.categorias
          .map((cat) => `<span class="modal-cat-tag">${escapeHtml(cat)}</span>`)
          .join('');
      } else {
        modalCategoriesSection.hidden = true;
      }
    }

    // Link do WhatsApp contextualizado com o veículo
    if (modalWhatsappBtn) {
      modalWhatsappBtn.href = buildVehicleWhatsappUrl(vehicle);
    }

    document.body.classList.add('modal-open');

    if (!vehicleModal.open) {
      vehicleModal.showModal();
    }

    if (updateHash && vehicle.slug) {
      history.replaceState(null, '', `#${vehicle.slug}`);
    }
  }

  function closeVehicleModal() {
    if (!vehicleModal) return;
    if (vehicleModal.open) {
      vehicleModal.close();
    }
  }

  function initModalEvents() {
    if (!vehicleModal) return;

    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', closeVehicleModal);
    }
    if (modalBackCatalogBtn) {
      modalBackCatalogBtn.addEventListener('click', closeVehicleModal);
    }

    if (galleryPrevBtn) {
      galleryPrevBtn.addEventListener('click', () => {
        state.currentPhotoIndex -= 1;
        updateModalGalleryPhoto();
      });
    }
    if (galleryNextBtn) {
      galleryNextBtn.addEventListener('click', () => {
        state.currentPhotoIndex += 1;
        updateModalGalleryPhoto();
      });
    }

    vehicleModal.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      state.currentModalVehicle = null;
      if (window.location.hash && !['#inicio', '#veiculos', '#contato', '#topo'].includes(window.location.hash)) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });

    // Fallback obrigatório para navegadores que ainda não suportam <dialog closedby="any">
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      vehicleModal.addEventListener('click', (event) => {
        if (event.target !== vehicleModal) return;

        const rect = vehicleModal.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;

        if (isDialogContent) return;

        vehicleModal.close();
      });
    }

    // Navegação por setas do teclado quando houver múltiplas fotos no modal
    document.addEventListener('keydown', (event) => {
      if (!vehicleModal.open || !state.currentModalVehicle) return;
      const total = Array.isArray(state.currentModalVehicle.imagens)
        ? state.currentModalVehicle.imagens.length
        : 1;
      if (total <= 1) return;

      if (event.key === 'ArrowLeft') {
        state.currentPhotoIndex -= 1;
        updateModalGalleryPhoto();
      } else if (event.key === 'ArrowRight') {
        state.currentPhotoIndex += 1;
        updateModalGalleryPhoto();
      }
    });
  }

  function checkInitialHashRoute() {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const match = vehicles.find((v) => v.slug === hash || v.id === hash);
    if (match) {
      openVehicleModal(match, false);
    }
  }

  /**
   * Evita que o botão flutuante do WhatsApp encubra CTAs, botões ou controles
   * em qualquer largura ou posição de rolagem.
   */
  function updateFloatingWhatsappVisibility() {
    const floatingBtn = document.getElementById('floatingWhatsapp');
    if (!floatingBtn) return;

    const floatRect = floatingBtn.getBoundingClientRect();
    if (floatRect.width === 0 || floatRect.height === 0) return;

    const interactiveTargets = document.querySelectorAll(
      '.btn, .showcase-thumb, .filter-chip, .search-input, .card-title-btn'
    );

    let overlapsAnyControl = false;
    const pad = 6;

    for (const el of interactiveTargets) {
      if (el === floatingBtn) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;

      const intersects =
        r.left < floatRect.right + pad &&
        r.right > floatRect.left - pad &&
        r.top < floatRect.bottom + pad &&
        r.bottom > floatRect.top - pad;

      if (intersects) {
        overlapsAnyControl = true;
        break;
      }
    }

    floatingBtn.classList.toggle('is-avoiding-cta', overlapsAnyControl);
  }

  /**
   * Inicialização geral
   */
  function init() {
    initMobileMenu();
    initHeroShowcase();
    initModalEvents();

    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        state.searchQuery = event.target.value || '';
        updateCatalogView();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        state.searchQuery = '';
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        updateCatalogView();
      });
    }

    if (resetFiltersInlineBtn) {
      resetFiltersInlineBtn.addEventListener('click', resetAllFilters);
    }

    if (emptyResetBtn) {
      emptyResetBtn.addEventListener('click', resetAllFilters);
    }

    updateHeroShowcase(0);
    updateCatalogView();
    checkInitialHashRoute();
    updateFloatingWhatsappVisibility();

    window.addEventListener('scroll', updateFloatingWhatsappVisibility, { passive: true });
    window.addEventListener('resize', updateFloatingWhatsappVisibility, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
