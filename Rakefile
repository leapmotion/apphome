require 'json'
require 'csv'
require 'nokogiri'
require 'open-uri'

desc "Generate software list"
task :generate_list do
  CSV.open("deps.csv", "w") do |f|
    f << ["Name", "Version", "URL", "License", "Required from"]
    get_dependencies(File.expand_path("..", __FILE__)).each do |dep|
      puts "name ... #{dep[:name]}"
      doc = Nokogiri::HTML(open("https://npmjs.org/package/#{dep[:name]}"))
      license_node = doc.search "[text()*='License']"
      license = if !license_node.empty?
        license_node.first.parent.css('a').text
      else
        "unknown"
      end

      puts "license ... #{license}"

      repo_node = doc.search "[text()*='Repository']"
      link = repo_node.first && repo_node.first.parent.css('a').first
      homepage = if link
        link['href']
      else
        "https://npmjs.org/package/#{dep[:name]}"
      end

      puts "homepage ... #{homepage}"

      f << [dep[:name], dep[:version], homepage, license, dep[:required_by]]
    end
  end
end

def get_dependencies(path)
  puts "working on #{path}"
  current_package_json = JSON.parse(File.read(File.join(path, "package.json")))
  dependency_list = current_package_json['dependencies']
  child_dependencies = dependency_list.nil? ? [] : dependency_list.map do |name, version|
    child_path = File.join(path, "node_modules", name)
    if File.exist?(child_path)
      package_json = JSON.parse(File.read(File.join(child_path, "package.json")))
      licenses = (package_json['licenses'] || []).map{|l| l['type']}
      [{name: package_json['name'], version: package_json['version'], homepage: Array(package_json['homepage']).compact.first, licenses: licenses, required_by: current_package_json['name']}] + get_dependencies(child_path)
    else
      nil
    end
  end
  child_dependencies.uniq!
  child_dependencies.compact!
  child_dependencies.flatten!
  child_dependencies
end