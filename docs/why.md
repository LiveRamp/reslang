# Why Do We Need Reslang?

Reslang (aka Resource Language) is a fast and expressive way to create resource-oriented Swagger API definitions.

You can think of it as a Domain Specific Language for creating APIs, specifically tailored for the LiveRamp environment. The Swagger output produced automatically conforms to [LiveRamp's API standards](./docs/LiveRampAPIStandards.pdf).

## Key Advantages Over Swagger

Why use Reslang when Swagger is clearly more expressive? There are a few reasons:

-   Reslang guarantees full, automagic conformance with our entire API ruleset
-   It forces API designers to think in terms of resources
-   Reslang is far more concise & preserves the intent of the API creator better
    -   A Reslang description is typically one-fifth to one-tenth the size of the Swagger equivalent
    -   It specifies how versioning works. Swagger, on the other hand, expresses no opinion on resource versioning.
    -   Reslang enforces a resource perspective. Swagger itself expresses no preference, and API creators can easily default to RPC.
-   We can generate diagrams, event specifications and JSON schemas from a reslang definition
