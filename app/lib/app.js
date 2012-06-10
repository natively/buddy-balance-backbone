$(function() {

  Parse.$ = jQuery;

  // Initialize Parse with your Parse application javascript keys
  Parse.initialize("U4AEUFjfLftt6fySkUiRYyowbG4I5ZrhG4zAAzDD",
                   "8fCPiULZWzp56JjXgOe0sIyKPRW17Z5oFyxJj4Wn");
  
  var Balance = Parse.Object.extend("Balance", {
  });

  var BalanceList = Parse.Collection.extend({
    model: Balance
  })

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

  var Transaction = Parse.Object.extend("Transaction", {
    defaults: {
      confirmed: true
    }
  });

  var TransactionList = Parse.Collection.extend({
    model: Transaction
  });

  var TransactionView = Parse.View.extend({
    tagName: "li",
    template: _.template($('#transaction-template').html()),
    initialize: function() {},
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      return this;
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
        'addOneTransaction',
        'addAll',
        'render'
      );

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

      this.balances.bind('all',   this.renderBalances);
      this.balances.fetch();

      // Draw
      this.$el.html(_.template($("#main-view-template").html()));
      this.render();
    },

    render: function() {
      this.delegateEvents();
    },

    renderBalances: function() {
      this.$("tr").not(".header-row").empty();
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
      this.$(".recent-transction-list").empty();
      this.transactions.each(this.addOneTransaction);
    },

    enterTransaction: function() {
      tAmount = parseFloat(this.$("#transaction-amount").val());
      if(this.$("#to-me").hasClass("active")) {
        tAmount *= -1;
      }
      tUser = this.$("#transaction-target").val();

      // write and substitute this here:
      // t = new Transaction({
      //   amount: tAmount,
      //   memo: this.$("#transaction-memo").val(),
      //   targetUser: tUser,
      //   user: Parse.User.current(),
      //   ACL: new Parse.ACL(Parse.User.current())
      // });
      // validateTransaction(t);

      if(isNaN(tAmount) || tUser === "") {
        return;
      }
      this.transactions.create({
        amount: tAmount,
        memo: this.$("#transaction-memo").val(),
        targetUser: tUser,
        user: Parse.User.current(),
        ACL: new Parse.ACL(Parse.User.current())
      })
      this.$("input").val('');
    }
  });

  var UserView = Parse.View.extend({
    events: {
      "click .sign-out" : "signOut"
    },

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

      Parse.User.signUp(username, password, { ACL: new Parse.ACL(), email: email, name: fullname }, {
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
    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
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
