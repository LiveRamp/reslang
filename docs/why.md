# Why Do We Need Reslang?

Reslang (aka Resource Language) is a fast and expressive way to create resource-oriented Swagger API definitions.

You can think of it as a Domain Specific Language for creating APIs, specifically tailored for the LiveRamp environment. The Swagger output produced automatically conforms to the documented [LiveRamp API standards](https://docs.google.com/document/d/1HHkdHXVj8vQ4XLKlmwD5QggV0lTg08_tI9J_tF5Qe9Q/edit?usp=sharing).

## Key Advantages Over Swagger

Why use Reslang when Swagger is clearly more expressive? There are a few reasons:

-   Reslang guarantees full, automagic conformance with our [entire API spec](https://docs.google.com/document/d/1HHkdHXVj8vQ4XLKlmwD5QggV0lTg08_tI9J_tF5Qe9Q/edit?usp=sharing)
-   It forces API designers to think in terms of resources
-   Reslang is far more concise & preserves the intent of the API creator better
    -   A Reslang description is typically one-fifth the size of the Swagger equivalent
    -   It specifies how versioning works. Swagger, on the other hand, expresses no opinion on resource versioning.
    -   Reslang enforces a resource perspective. Swagger itself expresses no preference, and API creators can easily default to RPC.
-   We can generate diagrams and other specs from a reslang definition
