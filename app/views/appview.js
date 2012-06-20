// The main view for the app
var AppView = Parse.View.extend({
  el: $("#BuddyBalanceApp"),

  initialize: function() {
    this.render();
  },

  render: function() {
    if (Parse.User.current()) {
      new UserView();
      new ManageTransactionsView();
    } else {
      new LogInView();
    }
  }
});

var App = new AppView();
