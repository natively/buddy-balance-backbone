require 'fssm'

# define the load order of your js files
$file_list = %w{
  app/init.js
  app/models/balance.js
  app/models/transaction.js
  app/models/pending.js
  app/collections/balancelist.js
  app/collections/buddylist.js
  app/collections/transactionlist.js
  app/collections/pendinglist.js
  app/views/balanceview.js
  app/views/transactionview.js
  app/views/userview.js
  app/views/managetransactionsview.js
  app/views/loginview.js
  app/views/appview.js
}

$root_dir = "app"

def packit
  output_name = "lib/app.js"

  output = "$(function() {\n"

  $file_list.each do |f|
    output << File.open(f).read << "\n"
  end

  File.open(output_name, "w") do |f|
    f.puts output
    f.puts "});"
  end

  puts "#{Time.now.ctime} successfully wrote to #{output_name}"
end

# run the script on load
puts "Packit is now watching your #{$root_dir} directory for changes."
packit

# watch the $root_dir for updates and rerun packit accordingly
FSSM.monitor($root_dir) do
  update do
    packit
  end
end
