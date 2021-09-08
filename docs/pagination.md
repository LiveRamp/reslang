<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

-   [Pagination](#pagination)
    -   [Example](#example)
    -   [Default behavior](#default-behavior)
    -   [Custom pagination responses](#custom-pagination-responses)
        -   [Query params](#query-params)
    -   [Legacy pagination](#legacy-pagination)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Pagination

All multi-GET operations are paginated by default. LiveRamp's officially supported cursor pagination strategy is defined in [RFC API-3](https://liveramp.atlassian.net/wiki/spaces/CI/pages/1014498273/RFC+API-3+LiveRamp+API+Standards).

Reslang makes it easy to comply with LiveRamp's pagination standards by supporting `pagination {}` blocks for `MULTIGET`s.

When these blocks are omitted, Reslang defaults to a compliant cursor pagination strategy. But the block can also be included and customized to support all fields mentioned in the RFC above.

### Example

For an example of pagination blocks in Reslang, see [pagination api](../models/pagination/api.reslang).

### Default behavior

This code...

```
/operations
  MULTIGET
```

...is equivalent to:

```
/operations
  MULTIGET pagination {
    after = true
    defaultLimit = <the default limit from rules.json>
    maxLimit = <the maximum limit from rules.json>
}
```

This block will cause Reslang to include a `_pagination` object in the response body, which itself contains a cursor called `after`. For details about these fields, see [Custom pagination responses](#custom-pagination-responses).

This block will also cause Reslang to specify a query parameter for this operation called `after`, which represents a cursor, as well as a query parameter called `limit`, indicating how many resources to return by default (see [Query params](#query-params) for details).

A request and response might look like:

```
GET /the-resources?limit=10&after=abc123xyz HTTP/1.1

...

{
  "theResults": ["resource_1", "resource_2", ...],

  "_pagination": {
    "after": "<cursor string>"
  }
}
```

### Custom pagination responses

To customize a multi-GET's pagination response, supply a `pagination` block. These blocks must be specified immediately after the `MULTIGET` keyword, and they support several optional fields:

```
/operations
  MULTIGET pagination {
    defaultLimit  = 10
    maxLimit      = 100
    after         = true
    before        = true
    total         = true
    next          = true
    previous      = true
}
```

Besides `defaultLimit` and `maxLimit`, all values in the block are booleans: they're either included in the `_pagination` response (`true`), or they're not (`false`). Marking a value as `false` can help make the omission of a certain field explicit, but it is equivalent to removing it from the block entirely.

Field definitions:

-   `defaultLimit` is the number of resources to return when the user does not specify a `limit` in the query
-   `maxLimit` is the maximum limit allowed to be specified in a query
-   `after` is a cursor that can be passed to subsequent queries to continue retrieving results
-   `before` is a cursor that can implement backward pagination
-   `total` indicates the number of records that would be returned given an infinite limit
-   `next` is a hypermedia link that will return the next set of results
-   `previous` is a hypermedia link that will return the previous set of results.

Reslang will warn and ignore all unrecognized pagination options.

#### Query params

Since `limit` is supported for all paginated queries, Reslang will always ensure that it is specified as a query parameter. If no `defaultLimit` or `maxLimit` are specified in the `pagination {}` block, then Reslang will use whatever is configured in [rules.json](../src/library/rules.json) (or default to sensible values).

When `after` and/or `before` cursors are specified in a pagination block, Reslang will automatically add these as query parameters to the given operation, in addition to adding them to the `_pagination` response body. The cursors are only useful if they are present in both queries and responses.

The other fields (`total`, `next`, and `previous`) do not correspond to query params, so they are only ever added to the `_pagination` response body.

### Legacy pagination

For APIs that still use the legacy limit+offset pagination strategy, this can be specified with the `deprecated-offset-pagination` keyword:

```
/operations
   MULTIGET deprecated-offset-pagination
```

Note the lack of curlies `{}`. This keyword offers backward-compatible limit+offset pagination, and includes hard-coded query params (`limit` and `offset`), as well as a hard-coded response header (`X-Total-Count`).

And finally, if you happen to need un-paginated multi-GET operations, use the `no-pagination` keyword:

```
/operations
  MULTIGET no-pagination
```
