# Diagram definitions

To generate a diagram, add a definition inside one of your .reslang files, specify which definitions should be included.

E.g. the File and Directory API diagram is as follows:

```
diagram main {
    /includeall
        files.reslang
}
```

To generate the dotviz, use a command like the following:

```
./reslang models/file --diagram main --open
```

Notice the `--diagram main` option references the diagram name.
Multiple named `diagram` specifications can be used, allowing the
entire API diagram to be partitioned for convenient presentation.
This will open up the online graphviz viewer and copy the dotviz output to the clipboard. Replace the text in the browser with the clipboard text and voila, you have a diagram.

![Diagram](dotviz.png)

## Advanced Usage

You can customize what is included as fully expanded by using /include. You can control what is included but not expanded using /import. You can exclude elements using /exclude, and finally you can fold association into inline attributes using /fold.

You can also draw any number of groups around elements using the /group command.

```
diagram destinationaccount {
    /includeAll
        destination-account.reslang

    /include
        distribution.IdentifierTypeMapping

    /import
        identity.IdentifierPool
        distribution.Destination::Endpoint
        distribution.Destination::TaxonomyConfiguration

    /exclude
        ConfigurableEndpointProperty

    /fold
        properties of DeliveryInstructions

    /group "Copied from Destination::Integration"
        Integration
        distribution.IdentifierTypeMapping
        identity.IdentifierPool
        distribution.Destination::Endpoint
        distribution.Destination::TaxonomyConfiguration

```

![Diagram](dotviz-destinationaccount.png)
