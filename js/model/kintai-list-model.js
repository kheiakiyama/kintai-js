var kintaiList = Parse.Collection.extend({

  // Reference to this collection's model.
  model: kintai,

  // Filter down the list of all kintai items that are finished.
  done: function() {
    return this.filter(function(kintai){ return kintai.get('done'); });
  },

  // Filter down the list to only kintai items that are still not finished.
  remaining: function() {
    return this.without.apply(this, this.done());
  },

  // We keep the kintais in sequential order, despite being saved by unordered
  // GUID in the database. This generates the next order number for new items.
  nextOrder: function() {
    if (!this.length) return 1;
    return this.last().get('order') + 1;
  },

  // kintais are sorted by their original insertion order.
  comparator: function(kintai) {
    return kintai.get('order');
  }

});
