# EFI Sunburst for Displaying Taxonomic Hierarchy in SSNs

This project provides code for displaying a taxonomic hierarchy in a sunburst fasion.  It uses the
`sunburst-chart` library that is available at `https://github.com/vasturiano/sunburst-chart`.

## Installation

PHP's composer dependency manager is used as the installation tool.  Add the following to the `require`
block:

    "efiillinois/sunburst": "main-dev"

Add the following in the `repositories` section:

    {
        "type": "vcs",
        "url": "https://github.com/EnzymeFunctionInitiative/sunburst.git"
    }

In the `scripts` section, add a `post-update-cmd` section and include the following commands
(these are necessary to copy the files that are installed in the `vendor` directory into a
directory accessible by the web server):

    "scripts": {
        "post-update-cmd": [
            "mkdir -p html/vendor/efiillinois/sunburst/php",
            "mkdir -p html/vendor/efiillinois/sunburst/web",
            "cp -R vendor/efiillinois/sunburst/php/* html/vendor/efiillinois/sunburst/php",
            "cp -R vendor/efiillinois/sunburst/web/* html/vendor/efiillinois/sunburst/web",
            "cp -R vendor-post/efiillinois/sunburst/php/* html/vendor/efiillinois/sunburst/php"
        ]
    }

Finally, install with `composer`:

    composer update


## Configuration

`composer` will install files into the `vendor` directory, as well as `html/vendor/efiillinois.sunburst/php`.
In order to make the PHP backend work, the `config.php.example` file must be copied
to `config.php` and edited.  Enable the app-specific back-end by commenting/uncommenting the 


## Usage

There must be a `div` that will contain the rendered sunburst output.

The JavaScript application should be initialized in the jQuery `$(document).ready(function() {})`
function. As an example:

    // Called after the data has been transferred and the output rendered
    var onComplete = function() {};

    // This is the same directory that files are copied into during the `post-update-cmd` step
    var scriptAppDir = "/vendor/efiillinois/sunburst/php";
    var sbParams = {
            scriptApp: scriptAppDir + "/get_tax_data.php",
            fastaApp: scriptAppDir + "/get_sunburst_fasta.php",
            hasUniRef: false,
    };

    var sunburstApp = new AppSunburst(sbParams);
    // A container div
    sunburstApp.attachToContainer("taxonomy");
    sunburstApp.addSunburstFeatureAsync(onComplete);


