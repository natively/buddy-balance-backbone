$(function() {
Parse.$ = jQuery;

// Initialize Parse with your Parse application javascript keys
Parse.initialize("U4AEUFjfLftt6fySkUiRYyowbG4I5ZrhG4zAAzDD",
               "8fCPiULZWzp56JjXgOe0sIyKPRW17Z5oFyxJj4Wn");

var Balance = Parse.Object.extend("Balance", {
});
var Transaction = Parse.Object.extend("Transaction", {
  defaults: {
    confirmed: false
  },
  validateSelf: function() {
    return (!isNaN(tAmount) && tUser !== "" );
  }
});
var Pending = Parse.Object.extend("Pending", {
});
var BalanceList = Parse.Collection.extend({
  model: Balance
});
var BuddyList = Parse.Collection.extend({
  model: Parse.User
});
var TransactionList = Parse.Collection.extend({
  model: Transaction
});
var PendingList = Parse.Collection.extend({
  model: PendingList
});
var BalanceView = Parse.View.extend({
  tagName: "tr",

  template: _.template($('#balance-template').html()),

  initialize: function() {},

  render: function() {
    var rowClass = this.model.get("amount") > 0 ? 'owes-you' : 'owe';
    $(this.el).addClass(rowClass).html(this.template(this.model.toJSON()));
    return this;
  }
})

var TransactionView = Parse.View.extend({
  tagName: "tr",
  template: _.template($('#transaction-template').html()),
  initialize: function() {},
  render: function() {
    $(this.el).html(this.template(this.model.toJSON()));
    return this;
  }
});
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
var ManageTransactionsView = Parse.View.extend({
  events: {
    "click .enter-transaction" : "enterTransaction"
  },

  el: ".content",
  
  initialize: function() {
    _.bindAll(this,
      'enterTransaction',
      'reBalance',
      'renderBalances',
      'renderBuddyList',
      'addOneTransaction',
      'addAll',
      'render'
    );

    // be lazy :)
    var self = this;

    // Get transactions for the user
    this.transactions = new TransactionList();

    this.transactions.query = new Parse.Query(Transaction);
    this.transactions.query.equalTo("user", Parse.User.current());

    this.transactions.bind('add',     this.addOneTransaction);
    this.transactions.bind('add',     this.reBalance);
    this.transactions.bind('reset',   this.addAll);
    this.transactions.bind('all',     this.render);
    this.transactions.fetch();

    // Get balances for the user
    this.balances = new BalanceList();
    this.balances.query = new Parse.Query(Balance);
    this.balances.query.equalTo("user", Parse.User.current());
    this.balances.bind('all', this.renderBalances);
    this.balances.fetch();

    // Get the user's buddy list
    this.buddyList = new BuddyList();
    this.buddyList.bind( 'reset', this.renderBuddyList );
    Parse.User.current().fetch({
      success: function( user ) {
        self.buddyList.query = user.relation("buddies").query();
        
        self.buddyList.fetch();
      },
      error: function( obj, err ) {
        console.log( "error! " + err );
      }
    });

    // Draw
    this.$el.html(_.template($("#main-view-template").html()));
    this.render();
  },

  render: function() {
    this.delegateEvents();
  },

  renderBuddyList: function(collection, filter) {
    this.$(".typeahead").typeahead({
      source: collection.pluck("username")
    });
  },

  renderBalances: function() {
    this.$("#outstanding-balances-list tr").not(".header-row").empty();
    this.balances.each(function(balance) {
      var view = new BalanceView({model: balance});
      this.$(".outstanding-balances-list").append(view.render().el);  
    });
  },

  reBalance: function(transaction) {
    var bal = this.balances.filter( function(b) {
      return b.get("targetUser") === transaction.get("targetUser");
    });
    if( bal.length === 0 ) {
      this.balances.create({
        targetUser: transaction.get("targetUser"),
        ACL: new Parse.ACL(Parse.User.current()),
        amount: transaction.get("amount"),
        user: Parse.User.current()
      });
    } else {
      var oldBalance = bal[0].get("amount");
      var newBalance = oldBalance + transaction.get("amount");
      
      this.balances.getByCid(bal[0].cid).set("amount", newBalance).save();
    }
    // redraw balances table
    this.renderBalances();
  },

  addOneTransaction: function(transaction) {
    var view = new TransactionView({model: transaction});
    this.$(".recent-transaction-list").append(view.render().el);
  },

  addAll: function(collection, filter) {
    this.$(".recent-transaction-list tr").not(".header-row").empty();
    this.transactions.each(this.addOneTransaction);
  },

  enterTransaction: function() {
    tAmount = parseFloat(this.$("#transaction-amount").val());
    if(this.$("#to-me").hasClass("active")) {
      tAmount *= -1;
    }
    tUser = this.$("#transaction-target").val();
    tMemo = this.$("#transaction-memo").val()
    t = new Transaction({
      amount: tAmount,
      memo: tMemo,
      targetUser: tUser,
      user: Parse.User.current(),
      ACL: new Parse.ACL(Parse.User.current())
    });

    if( t.validateSelf() ) {
      this.transactions.add(t);
      t.save();

      // Add target to the user's buddy list
      buddyEmailList = this.buddyList.pluck("username");
      if( _.include(buddyEmailList, tUser) ) {
        // buddy already on the buddy list, add a transaction to them
      }
      else {
        // no user in the list, create them and add them to eachothers' lists
        var q = new Parse.Query( Parse.User );
        q.equalTo("username", tUser);
        q.find({
          success: function(u) {
            // user was found
            Parse.User.current().relation("buddies").add(u);
            Parse.User.current().save(null, {
              success: function() {},
              error: function() {}
            });
            // u = u[0]; // found user in array
          },
          // no user found, sign them up? lol
          error: function(e, o) {
            console.log("User not found");
          }
        });
      }
    }
    this.$("input").val('');
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
        new ManageTransactionsView();
        new UserView();
        self.undelegateEvents();
        delete self;
      },

      error: function(user, error) {
        self.$(".login-form .error").html("Invalid username or password. Please try again.").show();
        console.log(error);
        this.$(".login-form button").removeAttr("disabled");
      }
    });

    this.$(".login-form button").attr("disabled", "disabled");

    return false;
  },

  signUp: function(e) {
    var self = this;

    var user = new Parse.User();

    var username = this.$("#signup-email").val();
    var fullname = this.$("#signup-name").val();
    var email = this.$("#signup-email").val();
    var password = this.$("#signup-password").val();
    var acl = new Parse.ACL();
    acl.setPublicReadAccess(true);

    Parse.User.signUp(username, password, { ACL: acl, email: email, name: fullname }, {
      success: function(user) {
        new ManageTransactionsView();
        new UserView();
        self.undelegateEvents();
        delete self;
      },

      error: function(user, error) {
        self.$(".signup-form .error").html(error.message).show();
        this.$(".signup-form button").removeAttr("disabled");
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

});
