APP.component.Select = ClassAvanti.extend({
  init (options) {
    this.options = options

    if (!this.options.className) {
      this.options.className = 'custom-select'
    }

    this.firstOption = 'Select'
    this.titleElement = `${this.options.className}__selected`

    this.wrapSelect()
  },

  wrapSelect () {
    if (this.options.selector.length === 0) {
      return false
    }

    this.options.selector.each((i, e) => {
      const _this = $(e)
      let firstOption = _this.find('option:first-child').text()
      const $parent = _this.parent('div')

      if ($parent.hasClass(this.options.className) || _this.is(':hidden')) {
        return true
      }

      if (firstOption === '') {
        firstOption = this.firstOption
      }

      const $wrap = _this.wrap(`<div class="${this.options.className}" />`).parent()
      $wrap.prepend(`<span class="${this.titleElement}">${firstOption}</span>`)

      this.bindChange(_this)
    })
  },

  bindChange ($element) {
    $element.on('change', function (e) {
      const _this = $(e.currentTarget)
      const val = _this.find('option:selected').text()

      $(`.${this.titleElement}`).text(val)
    })
  }
})
