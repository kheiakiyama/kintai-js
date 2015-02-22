// An example Parse.js Backbone application based on the kintai app by
// [Jérôme Gravel-Niquet](http://jgn.me/). This demo uses Parse to persist
// the kintai items and provide user authentication and sessions.

$(function() {

  Parse.$ = jQuery;

  // Initialize Parse with your Parse application javascript keys
  Parse.initialize(ParseConfig.ApplicationID, ParseConfig.JavaScriptKey);

  // kintai Model
  // ----------

  // This is the transient application state, not persisted on Parse
  var AppState = Parse.Object.extend("AppState", {
    defaults: {
      filter: "all"
    }
  });
// The main view that lets a user manage their kintai items
var ManagekintaisView = Parse.View.extend({

  // Our template for the line of statistics at the bottom of the app.
  statsTemplate: _.template($('#stats-template').html()),

  // Delegated events for creating new items, and clearing completed ones.
  events: {
    "keypress #new-kintai":  "createOnEnter",
    "click #clear-completed": "clearCompleted",
    "click #toggle-all": "toggleAllComplete",
    "click .log-out": "logOut",
    "click ul#filters a": "selectFilter"
  },

  el: ".content",

  // At initialization we bind to the relevant events on the `kintais`
  // collection, when items are added or changed. Kick things off by
  // loading any preexisting kintais that might be saved to Parse.
  initialize: function() {
    var self = this;

    _.bindAll(this, 'addOne', 'addAll', 'addSome', 'render', 'toggleAllComplete', 'logOut', 'createOnEnter');

    // Main kintai management template
    this.$el.html(_.template($("#manage-kintais-template").html()));
    
    this.input = this.$("#new-kintai");
    this.allCheckbox = this.$("#toggle-all")[0];

    // Create our collection of kintais
    this.kintais = new kintaiList;

    // Setup the query for the collection to look for kintais from the current user
    this.kintais.query = new Parse.Query(kintai);
    this.kintais.query.equalTo("user", Parse.User.current());
      
    this.kintais.bind('add',     this.addOne);
    this.kintais.bind('reset',   this.addAll);
    this.kintais.bind('all',     this.render);

    // Fetch all the kintai items for this user
    this.kintais.fetch();

    state.on("change", this.filter, this);
  },

  // Logs out the user and shows the login view
  logOut: function(e) {
    Parse.User.logOut();
    new LogInView();
    this.undelegateEvents();
    delete this;
  },

  // Re-rendering the App just means refreshing the statistics -- the rest
  // of the app doesn't change.
  render: function() {
    var done = this.kintais.done().length;
    var remaining = this.kintais.remaining().length;

    this.input.datepicker();

    this.$('#kintai-stats').html(this.statsTemplate({
      total:      this.kintais.length,
      done:       done,
      remaining:  remaining
    }));

    this.delegateEvents();

    this.allCheckbox.checked = !remaining;
  },

  // Filters the list based on which type of filter is selected
  selectFilter: function(e) {
    var el = $(e.target);
    var filterValue = el.attr("id");
    state.set({filter: filterValue});
    Parse.history.navigate(filterValue);
  },

  filter: function() {
    var filterValue = state.get("filter");
    this.$("ul#filters a").removeClass("selected");
    this.$("ul#filters a#" + filterValue).addClass("selected");
    if (filterValue === "all") {
      this.addAll();
    } else if (filterValue === "completed") {
      this.addSome(function(item) { return item.get('done') });
    } else {
      this.addSome(function(item) { return !item.get('done') });
    }
  },

  // Resets the filters to display all kintais
  resetFilters: function() {
    this.$("ul#filters a").removeClass("selected");
    this.$("ul#filters a#all").addClass("selected");
    this.addAll();
  },

  // Add a single kintai item to the list by creating a view for it, and
  // appending its element to the `<ul>`.
  addOne: function(kintai) {
    var view = new kintaiView({model: kintai});
    this.$("#kintai-list").append(view.render().el);
  },

  // Add all items in the kintais collection at once.
  addAll: function(collection, filter) {
    this.$("#kintai-list").html("");
    this.kintais.each(this.addOne);
  },

  // Only adds some kintais, based on a filtering function that is passed in
  addSome: function(filter) {
    var self = this;
    this.$("#kintai-list").html("");
    this.kintais.chain().filter(filter).each(function(item) { self.addOne(item) });
  },

  // If you hit return in the main input field, create new kintai model
  createOnEnter: function(e) {
    var self = this;
    if (e.keyCode != 13) return;

    this.kintais.create({
      date: this.input.val(),
      order:   this.kintais.nextOrder(),
      done:    false,
      user:    Parse.User.current(),
      ACL:     new Parse.ACL(Parse.User.current())
    });

    this.input.val('');
    this.resetFilters();
  },

  // Clear all done kintai items, destroying their models.
  clearCompleted: function() {
    _.each(this.kintais.done(), function(kintai){ kintai.destroy(); });
    return false;
  },

  toggleAllComplete: function () {
    var done = this.allCheckbox.checked;
    this.kintais.each(function (kintai) { kintai.save({'done': done}); });
  }
});

// The DOM element for a kintai item...
var kintaiView = Parse.View.extend({

  //... is a list tag.
  tagName:  "li",

  // Cache the template function for a single item.
  template: _.template($('#item-template').html()),

  // The DOM events specific to an item.
  events: {
    "click .toggle"              : "toggleDone",
    "dblclick label.kintai-content" : "edit",
    "click .kintai-destroy"   : "clear",
    "keypress .edit"      : "updateOnEnter",
    "blur .edit"          : "close"
  },

  // The kintaiView listens for changes to its model, re-rendering. Since there's
  // a one-to-one correspondence between a kintai and a kintaiView in this
  // app, we set a direct reference on the model for convenience.
  initialize: function() {
    _.bindAll(this, 'render', 'close', 'remove');
    this.model.bind('change', this.render);
    this.model.bind('destroy', this.remove);
  },

  // Re-render the contents of the kintai item.
  render: function() {
    $(this.el).html(this.template(this.model.toJSON()));
    this.input = this.$('.edit');
    this.input.datepicker();
    return this;
  },

  // Toggle the `"done"` state of the model.
  toggleDone: function() {
    this.model.toggle();
  },

  // Switch this view into `"editing"` mode, displaying the input field.
  edit: function() {
    $(this.el).addClass("editing");
    this.input.focus();
  },

  // Close the `"editing"` mode, saving changes to the kintai.
  close: function() {
    this.model.save({date: this.input.datepicker("getDate").format("{yyyy}/{MM}/{dd}") });
    this.input.datepicker("hide");
    $(this.el).removeClass("editing");
  },

  // If you hit `enter`, we're through editing the item.
  updateOnEnter: function(e) {
    if (e.keyCode == 13) this.close();
  },

  // Remove the item, destroy the model.
  clear: function() {
    this.model.destroy();
  }

});

  var LogInView = Parse.View.extend({
    events: {
      "submit form.login-form": "logIn",
      "submit form.signup-form": "signUp"
    },

    el: ".content",
    
    initialize: function() {
      _.bindAll(this, "logIn", "signUp");
      this.render();
    },

    logIn: function(e) {
      var self = this;
      var username = this.$("#login-username").val();
      var password = this.$("#login-password").val();
      
      Parse.User.logIn(username, password, {
        success: function(user) {
          new ManagekintaisView();
          self.undelegateEvents();
          delete self;
        },

        error: function(user, error) {
          self.$(".login-form .error").html("Invalid username or password. Please try again.").show();
          self.$(".login-form button").removeAttr("disabled");
        }
      });

      this.$(".login-form button").attr("disabled", "disabled");

      return false;
    },

    signUp: function(e) {
      var self = this;
      var username = this.$("#signup-username").val();
      var password = this.$("#signup-password").val();
      
      Parse.User.signUp(username, password, { ACL: new Parse.ACL() }, {
        success: function(user) {
          new ManagekintaisView();
          self.undelegateEvents();
          delete self;
        },

        error: function(user, error) {
          self.$(".signup-form .error").html(_.escape(error.message)).show();
          self.$(".signup-form button").removeAttr("disabled");
        }
      });

      this.$(".signup-form button").attr("disabled", "disabled");

      return false;
    },

    render: function() {
      this.$el.html(_.template($("#login-template").html()));
      this.delegateEvents();
    }
  });

  // The main view for the app
  var AppView = Parse.View.extend({
    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#kintaiapp"),

    initialize: function() {
      this.render();
    },

    render: function() {
      if (Parse.User.current()) {
        new ManagekintaisView();
      } else {
        new LogInView();
      }
    }
  });

  var AppRouter = Parse.Router.extend({
    routes: {
      "all": "all",
      "active": "active",
      "completed": "completed"
    },

    initialize: function(options) {
    },

    all: function() {
      state.set({ filter: "all" });
    },

    active: function() {
      state.set({ filter: "active" });
    },

    completed: function() {
      state.set({ filter: "completed" });
    }
  });

  var state = new AppState;

  new AppRouter;
  new AppView;
  Parse.history.start();
});
