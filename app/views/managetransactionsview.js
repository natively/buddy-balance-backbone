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
