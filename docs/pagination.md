<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

-   [Pagination](#pagination)
    -   [Default behavior](#default-behavior)
    -   [Custom pagination responses](#custom-pagination-responses)
        -   [Concrete values vs. variables](#concrete-values-vs-variables)
        -   [Query params](#query-params)
    -   [Legacy pagination](#legacy-pagination)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Pagination

All multi-GET operations are paginated by default. LiveRamp's officially supported pagination strategy is defined [here](https://docs.google.com/document/d/1O0s85E2RljltCTGAKiQq8h_-WfwR7lWV-e6OFxPppdg/edit).

(TODO: once Proposal 1 is merged to RFC-3, link the RFC instead)

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
    strategy = cursor
    limit = 10
    after = string
}
```

In other words, Reslang's default behavior for multi-GET operations is to:

1. include a `_pagination` field in the response body, which itself contains a field called `after`. This is the value to be passed as a query parameter in subsequent searches.
2. specify a query parameter for this operation called `after`, which represents a cursor (see [Query params](#query-params)).
3. specify a query parameter for this operation called `limit`, indicating how many resources to return be default.

So, the final response body will include:

```
{
  <...snip...>

  _pagination: {
    after: <CURSOR>
  }
}
```

### Custom pagination responses

To customize a multi-GET's pagination response, supply a `pagination` block. These blocks support several optional fields:

```
/operations
  MULTIGET pagination {
    strategy = cursor
    limit = 10
    maxLimit = 100
    after = string
    before = string
    total = int
    next = string
    previous = string
}
```

In order:

-   `strategy` is the means of pagination, with supported values of: `[ cursor | offset | none ]`
-   `limit` is the default amount of resources to return
-   `maxLimit` is the maximum limit allowed to be specified in search requests
-   `after` is a cursor that can be passed to subsequent searches to continue retrieving results
-   `before` is a cursor that can implement backward searches
-   `total` indicates the number of records that would be returned given an infinite limit
-   `next` is a hypermedia link that will return the next set of results
-   `previous` is a hypermedia link that will return the previous set of results.

Reslang will warn and ignore all unrecognized pagination options.

#### Concrete values vs. variables

Some pagination fields are concrete, and some are variable. For example, `limit` and `maxLimit` must be specified:

```
limit = 10
maxLimit = 100
```

But other fields, such as `after`, do not have fixed values. Instead, they are declared as variables by specifying only their type:

```
after = string
total = int
```

#### Query params

When `after` and `before` cursors are specified in a pagination block, Reslang will automatically add these as query parameters to the given operation, in addition to adding them to the `_pagination` response body.

The other fields (`total`, `next`, and `previous`) do not correspond to query params, so they are added only to the `_pagination` response body.

### Legacy pagination

For APIs that still use the legacy `limit+offset` pagination strategy, this can be specified:

```
/operations
   MULTIGET deprecated-offset-pagination
```

And for un-paginated multi-GET operations, pass a strategy of `none`:

```
/operations
  MULTIGET no-pagination
```
