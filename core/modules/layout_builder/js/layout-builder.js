/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(($, Drupal, Sortable) => {
  const {
    ajax,
    behaviors,
    debounce,
    announce,
    formatPlural
  } = Drupal;
  let layoutBuilderBlocksFiltered = false;
  behaviors.layoutBuilderBlockFilter = {
    attach(context) {
      const $categories = $('.js-layout-builder-categories', context);
      const $filterLinks = $categories.find('.js-layout-builder-block-link');

      const filterBlockList = e => {
        const query = e.target.value.toLowerCase();

        const toggleBlockEntry = (index, link) => {
          const textMatch = link.textContent.toLowerCase().indexOf(query) !== -1;
          $(link).toggle(textMatch);
        };

        if (query.length >= 2) {
          $categories.find('.js-layout-builder-category:not([open])').attr('remember-closed', '');
          $categories.find('.js-layout-builder-category').attr('open', '');
          $filterLinks.each(toggleBlockEntry);
          $categories.find('.js-layout-builder-category:not(:has(.js-layout-builder-block-link:visible))').hide();
          announce(formatPlural($categories.find('.js-layout-builder-block-link:visible').length, '1 block is available in the modified list.', '@count blocks are available in the modified list.'));
          layoutBuilderBlocksFiltered = true;
        } else if (layoutBuilderBlocksFiltered) {
          layoutBuilderBlocksFiltered = false;
          $categories.find('.js-layout-builder-category[remember-closed]').removeAttr('open').removeAttr('remember-closed');
          $categories.find('.js-layout-builder-category').show();
          $filterLinks.show();
          announce(Drupal.t('All available blocks are listed.'));
        }
      };

      $(once('block-filter-text', 'input.js-layout-builder-filter', context)).on('keyup', debounce(filterBlockList, 200));
    }

  };

  Drupal.layoutBuilderBlockUpdate = function (item, from, to) {
    const $item = $(item);
    const $from = $(from);
    const itemRegion = $item.closest('.js-layout-builder-region');

    if (to === itemRegion[0]) {
      const deltaTo = $item.closest('[data-layout-delta]').data('layout-delta');
      const deltaFrom = $from ? $from.closest('[data-layout-delta]').data('layout-delta') : deltaTo;
      ajax({
        url: [$item.closest('[data-layout-update-url]').data('layout-update-url'), deltaFrom, deltaTo, itemRegion.data('region'), $item.data('layout-block-uuid'), $item.prev('[data-layout-block-uuid]').data('layout-block-uuid')].filter(element => element !== undefined).join('/')
      }).execute();
    }
  };

  behaviors.layoutBuilderBlockDrag = {
    attach(context) {
      const regionSelector = '.js-layout-builder-region';
      Array.prototype.forEach.call(context.querySelectorAll(regionSelector), region => {
        Sortable.create(region, {
          draggable: '.js-layout-builder-block',
          ghostClass: 'ui-state-drop',
          group: 'builder-region',
          onEnd: event => Drupal.layoutBuilderBlockUpdate(event.item, event.from, event.to)
        });
      });
    }

  };
  behaviors.layoutBuilderDisableInteractiveElements = {
    attach() {
      const $blocks = $('#layout-builder [data-layout-block-uuid]');
      $blocks.find('input, textarea, select').prop('disabled', true);
      $blocks.find('a').not((index, element) => $(element).closest('[data-contextual-id]').length > 0).on('click mouseup touchstart', e => {
        e.preventDefault();
        e.stopPropagation();
      });
      $blocks.find('button, [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"]):not(.tabbable)').not((index, element) => $(element).closest('[data-contextual-id]').length > 0).attr('tabindex', -1);
    }

  };
  $(window).on('dialog:aftercreate', (event, dialog, $element) => {
    if (Drupal.offCanvas.isOffCanvas($element)) {
      $('.is-layout-builder-highlighted').removeClass('is-layout-builder-highlighted');
      const id = $element.find('[data-layout-builder-target-highlight-id]').attr('data-layout-builder-target-highlight-id');

      if (id) {
        $(`[data-layout-builder-highlight-id="${id}"]`).addClass('is-layout-builder-highlighted');
      }

      $('#layout-builder').removeClass('layout-builder--move-blocks-active');
      const layoutBuilderWrapperValue = $element.find('[data-add-layout-builder-wrapper]').attr('data-add-layout-builder-wrapper');

      if (layoutBuilderWrapperValue) {
        $('#layout-builder').addClass(layoutBuilderWrapperValue);
      }
    }
  });

  if (document.querySelector('[data-off-canvas-main-canvas]')) {
    const mainCanvas = document.querySelector('[data-off-canvas-main-canvas]');
    mainCanvas.addEventListener('transitionend', () => {
      const $target = $('.is-layout-builder-highlighted');

      if ($target.length > 0) {
        const targetTop = $target.offset().top;
        const targetBottom = targetTop + $target.outerHeight();
        const viewportTop = $(window).scrollTop();
        const viewportBottom = viewportTop + $(window).height();

        if (targetBottom < viewportTop || targetTop > viewportBottom) {
          const viewportMiddle = (viewportBottom + viewportTop) / 2;
          const scrollAmount = targetTop - viewportMiddle;

          if ('scrollBehavior' in document.documentElement.style) {
            window.scrollBy({
              top: scrollAmount,
              left: 0,
              behavior: 'smooth'
            });
          } else {
            window.scrollBy(0, scrollAmount);
          }
        }
      }
    });
  }

  $(window).on('dialog:afterclose', (event, dialog, $element) => {
    if (Drupal.offCanvas.isOffCanvas($element)) {
      $('.is-layout-builder-highlighted').removeClass('is-layout-builder-highlighted');
      $('#layout-builder').removeClass('layout-builder--move-blocks-active');
    }
  });
  behaviors.layoutBuilderToggleContentPreview = {
    attach(context) {
      const $layoutBuilder = $('#layout-builder');
      const $layoutBuilderContentPreview = $('#layout-builder-content-preview');
      const contentPreviewId = $layoutBuilderContentPreview.data('content-preview-id');
      const isContentPreview = JSON.parse(localStorage.getItem(contentPreviewId)) !== false;

      const disableContentPreview = () => {
        $layoutBuilder.addClass('layout-builder--content-preview-disabled');
        $('[data-layout-content-preview-placeholder-label]', context).each((i, element) => {
          const $element = $(element);
          $element.children(':not([data-contextual-id])').hide(0);
          const contentPreviewPlaceholderText = $element.attr('data-layout-content-preview-placeholder-label');
          const contentPreviewPlaceholderLabel = Drupal.theme('layoutBuilderPrependContentPreviewPlaceholderLabel', contentPreviewPlaceholderText);
          $element.prepend(contentPreviewPlaceholderLabel);
        });
      };

      const enableContentPreview = () => {
        $layoutBuilder.removeClass('layout-builder--content-preview-disabled');
        $('.js-layout-builder-content-preview-placeholder-label').remove();
        $('[data-layout-content-preview-placeholder-label]').each((i, element) => {
          $(element).children().show();
        });
      };

      $('#layout-builder-content-preview', context).on('change', event => {
        const isChecked = $(event.currentTarget).is(':checked');
        localStorage.setItem(contentPreviewId, JSON.stringify(isChecked));

        if (isChecked) {
          enableContentPreview();
          announce(Drupal.t('Block previews are visible. Block labels are hidden.'));
        } else {
          disableContentPreview();
          announce(Drupal.t('Block previews are hidden. Block labels are visible.'));
        }
      });

      if (!isContentPreview) {
        $layoutBuilderContentPreview.attr('checked', false);
        disableContentPreview();
      }
    }

  };

  Drupal.theme.layoutBuilderPrependContentPreviewPlaceholderLabel = contentPreviewPlaceholderText => {
    const contentPreviewPlaceholderLabel = document.createElement('div');
    contentPreviewPlaceholderLabel.className = 'layout-builder-block__content-preview-placeholder-label js-layout-builder-content-preview-placeholder-label';
    contentPreviewPlaceholderLabel.innerHTML = contentPreviewPlaceholderText;
    return `<div class="layout-builder-block__content-preview-placeholder-label js-layout-builder-content-preview-placeholder-label">${contentPreviewPlaceholderText}</div>`;
  };
})(jQuery, Drupal, Sortable);