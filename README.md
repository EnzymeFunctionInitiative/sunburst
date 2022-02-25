# sunburst

# Installation

composer update

wherever the js and css code is used look at html/vendor/efillionis/sunburst/web/(js|css)

wherever the php code is needed, copy vendor/efiillinois/sunburst/web/bin/get_tax_data.php.example to local app dir and
modify it as necessary.  usually doesn't need modification, if used in the EFI web tools.

copy vendor/efiillinois/sunburst/php/get_sunburst_fasta.php.conf.example to
vendor/efiillinois/sunburst/php/get_sunburst_fasta.php.conf and modify it as necessary.

copy vendor/efiillinois/sunburst/php/get_sunburst_fasta.inc.php.example to
vendor/efiillinois/sunburst/php/get_sunburst_fasta.inc.php and modify it as necessary.

when using get_sunburst_fasta.php, use vendor/efiillinois/sunburst/php/get_sunburst_fasta.php, which should include
the previously-mentioned conf and inc files.

when using the js code, appDir should be where the get_sunburst_fasta.php is, e.g. vendor/efiillinois/sunburst/php

# Example setup

vendor/efiillinois/sunburst/php/get_sunburst_fasta.php (use as-is)

vendor/efiillinois/sunburst/php/get_sunburst_fasta.inc.php

vendor/efiillinois/sunburst/php/get_sunburst_fasta.php.conf


js

ascore = []; // Optional
new AppSunburst(jobId, jobKey, ascore, unirefVersion, "/dev/vendor/efiillinois/sunburst/php");


