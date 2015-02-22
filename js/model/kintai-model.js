// Our basic kintai model has `content`, `order`, and `done` attributes.
var kintai = Parse.Object.extend("kintai", {
  // Default attributes for the kintai.
  defaults: {
    content: "empty kintai...",
    done: false
  },

  // Ensure that each kintai created has `content`.
  initialize: function() {
    if (!this.get("content")) {
      this.set({"content": this.defaults.content});
    }
  },

  // Toggle the `done` state of this kintai item.
  toggle: function() {
    this.save({done: !this.get("done")});
  }
});