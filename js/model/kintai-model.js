var kintai = Parse.Object.extend("Kintai", {
  // Default attributes for the kintai.
  defaults: {
    type: 0,
    date: new Date(),
    done: false
  },

  // Ensure that each kintai created has `date`.
  initialize: function() {
    if (!this.get("date")) {
      this.set({"date": this.defaults.date});
    }
  },

  // Toggle the `done` state of this kintai item.
  toggle: function() {
    this.save({done: !this.get("done")});
  }
});