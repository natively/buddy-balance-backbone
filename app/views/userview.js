var UserView = Parse.View.extend({
  events: {
    "click .sign-out" : "signOut"
  },
  // Just going to add a harmless comment here.
  el: ".user-options",

  initialize: function() {
    this.render();
  },

  render: function() {
    this.$el.html(_.template($("#user-template").html()));
    this.delegateEvents();
  },

  signOut : function() {
    Parse.User.logOut();
    new LogInView();
    this.undelegateEvents();
    this.$el.empty();
    delete this;
  }
});