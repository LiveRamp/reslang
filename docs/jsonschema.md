# JSON Schema Generation

You can generate JSON schema from any structure by doing something like:

    ./reslang ./models/gendiagram --jsonschema SegmentDeliveryAttemptStats --stdout

Note a few things:

- The default is to use the JSON schema root specificed (e.g. SegmentDeliveryAttemptStats) and include everything it references
- If you use --followresources it will generate only the same definitions it uses for Swagger resources
- If you use "noroot" it will include any structs, unions or enums in the file, and ignore resources

The example above generates the following schema:

```
{
  "$id": "https://schemas.liveramp.com/segmentdeliveryattemptstats",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "totalAudienceKeys": {
      "type": "integer",
      "format": "int64"
    },
    "audienceKeysMatched": {
      "type": "integer",
      "format": "int64"
    },
    "targetIdentifiersMatched": {
      "type": "integer",
      "format": "int64"
    },
    "targetIdentifiersDelivered": {
      "type": "integer",
      "format": "int64"
    }
  },
  "required": [
    "totalAudienceKeys",
    "audienceKeysMatched",
    "targetIdentifiersMatched",
    "targetIdentifiersDelivered"
  ]
}
```