# Reslang: API definitions made easy

Relang is a simple language for describing resource-oriented APIs & turning them into Swagger. It produces Swagger which is fully aligned with the RFC API-3 standards.

## Installation

1. ensure node & yarn are installed
2. clone the repo
3. yarn install
4. yarn test

## Running

Test it out by typing:

    ./reslang

This should bring up the options.

## Creating swagger

To create swagger, you first create a reslang file. Then you simply ask the reslang program to turn this into swagger.

Note that the models directory has a set of example definitions.

    ./reslang models/simple-resource.reslang

This will also copy the swagger into the clipboard. If you want it to stdout also, use --stdout.

If you want it to open the swagger editor for you, use --open. You will then have to paste the clipboard into the editor.

    ./reslang models/simple-resource.reslang --stdout --open

## Creating a graphical view

Reslang can generate dotviz output, which provides a nice graphical view of the resources.

    ./reslang models/simple-resource.reslang --dotviz

will copy the dotviz output to the clipboard.

If you use --open, it will open your browser at a nice graphviz online editor. Paste the clipboard into the editor and you will get your graphjical view.

    ./reslang models/simple-resource.reslang --dotviz --open

## Reslang resource specification

Example resource definitions are in the models/ directory. Here's the simple-resource definition:

    /* this is a simple resource
    designed to show the potential */
    version 0.0.1

    // A garage is a place to store cars
    resource Garage {
    	// simple id
    	id: string
    	name: string

    	operations
    		// this is a PUT comment
    		PUT
    		// this is a POST comment
    		POST GET DELETE MULTIGET id name
    }

You must always start off with a version number for the API. Then we simple specify a resource. Id is a special name, and is always used to identify objects.

A more complex example is in complex-resource which defines subresources and various linkages. request.reslang defines a request and various verbs. This example also introduces enums, linkages to imported resources and attribute multiplicity.

	/* This is a more complex example, featuring
	a car with a set of wheel subresources*/

	version 0.0.1

	import Garage from simple-resource;

	/* this is a Car resource */
	resource Car {
		id: int
		bought: date output
		brand: BrandEnum
		engine: Specification
		components: Specification[]
		home: linked Garage
		rented: linked Garage[]

		operations
			POST /* this is a get comment */ GET MULTIGET id, brand
	}
		
	// this is a specification!
	structure Specification {
		type: string
		documentation: string
	}

	// A wheel is owned by a car
	subresource Wheel of Car {
		id: int
		radius: double

		operations
			GET PUT POST MULTIGET id
	}

	enum BrandEnum {
		TOYOTA
		FORD
	}

