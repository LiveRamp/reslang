## 2.2.5 9/16/2020

Now installable as a cmd line tool. Please follow the installation instructions, or run ./install-reslang to create links

## 2.0.0 8/23/2020

Fixed up inlining of attributes in unions, aligned now with treatment of structures.

## 1.3.0 3/26/2020

Added "value-of" for embedding a full representation of a resource in another structure, as opposed to "link"

## v1.2.0 3/24/2020

Added event / AsyncAPI specifications and made "operation Ids" a lot more readable.

## v1.1.0 3/18/2020

Bug fix for resource-level action paths not including parentIds

## v1.0.0 3/17/2020

First official release. The following defects have been addressed:

-   allows arbitrary nesting of subresources and actions
-   configurable rule checker to restrict nesting (currently set at 2 for resources, 3 for actions)
-   added "resource" type to avoid advanced use of configuration- and asset- resources
-   fixed action URLs to include /actions as per RFC API-3
-   corrected POST action response code to 200 as per RFC API-3
-   automatically adds 404 not found to GET / PUT / PATCH / DELETE
-   added resource-level actions using keyword "resource-level" before action e.g. /v1/fields/actions/delete-all applies to all fields
-   added min-length:x and max-length:x keywords to string types
-   removed refs from YAML output
-   fixed snake-case URLs and camelCase parameters
-   added "representation" parameters for adjusting representation returned on queries
-   added "long" type
-   better optionality via "optional-get" etc pararmeters
-   full PATCH support
-   array multiplicities [min..max]
-   parent ids now use correct resource names
-   regeneration of test data now 20x faster
-   embeds Reslang version in YAML output

Next focus will be event + AsyncAPI generation.
