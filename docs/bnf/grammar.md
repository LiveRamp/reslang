
# grammar.pegjs

## 


### structure

![structure](./grammar/structure.svg)

Used by: [reslang](#reslang)
References: [_](#_), [description](#description), [name](#name), [structconstraints](#structconstraints), [attribute](#attribute)

### structconstraints

![structconstraints](./grammar/structconstraints.svg)

Used by: [structure](#structure)
References: [_](#_), [maxProperties](#maxProperties), [minProperties](#minProperties), [__](#__)

### minProperties

![minProperties](./grammar/minProperties.svg)

Used by: [structconstraints](#structconstraints)
References: [_](#_), [number](#number)

### maxProperties

![maxProperties](./grammar/maxProperties.svg)

Used by: [structconstraints](#structconstraints)
References: [_](#_), [number](#number)

### attributes

![attributes](./grammar/attributes.svg)

Used by: [header](#header), [payload](#payload), [resource](#resource), [subresource](#subresource), [action](#action)
References: [_](#_), [attribute](#attribute)

### attribute

![attribute](./grammar/attribute.svg)

Used by: [structure](#structure), [attributes](#attributes)
References: [_](#_), [description](#description), [name](#name), [ref](#ref), [array1](#array1), [array2](#array2), [modifiers](#modifiers), [constraints](#constraints), [__](#__)

### array1

![array1](./grammar/array1.svg)

Used by: [attribute](#attribute)
References: [_](#_)

### array2

![array2](./grammar/array2.svg)

Used by: [attribute](#attribute)

### modifiers

![modifiers](./grammar/modifiers.svg)

Used by: [attribute](#attribute)
References: [_](#_), [__](#__)

### constraints

![constraints](./grammar/constraints.svg)

Used by: [attribute](#attribute)
References: [_](#_), [maxLength](#maxLength), [minLength](#minLength), [__](#__)

### minLength

![minLength](./grammar/minLength.svg)

Used by: [constraints](#constraints)
References: [_](#_), [number](#number)

### maxLength

![maxLength](./grammar/maxLength.svg)

Used by: [constraints](#constraints)
References: [_](#_), [number](#number)

### number

![number](./grammar/number.svg)

Used by: [minProperties](#minProperties), [maxProperties](#maxProperties), [minLength](#minLength), [maxLength](#maxLength)

### enum

![enum](./grammar/enum.svg)

Used by: [reslang](#reslang)
References: [_](#_), [description](#description), [name](#name), [literal](#literal)

### literal

![literal](./grammar/literal.svg)

Used by: [enum](#enum)
References: [_](#_), [description](#description), [literalname](#literalname)

### literalname

![literalname](./grammar/literalname.svg)

Used by: [literal](#literal)

### ref

![ref](./grammar/ref.svg)

Used by: [attribute](#attribute), [include](#include), [dimport](#dimport), [exclude](#exclude), [fold](#fold), [errors](#errors)
References: [filename](#filename), [_](#_), [respath](#respath)

### respath

![respath](./grammar/respath.svg)

Used by: [ref](#ref)
References: [_](#_), [parents](#parents), [resname](#resname)

### noparentrespath

![noparentrespath](./grammar/noparentrespath.svg)

Used by: [resource](#resource)
References: [_](#_), [resname](#resname)

### parentrespath

![parentrespath](./grammar/parentrespath.svg)

Used by: [subresource](#subresource), [action](#action)
References: [_](#_), [parents](#parents), [name](#name)

### parents

![parents](./grammar/parents.svg)

Used by: [respath](#respath), [parentrespath](#parentrespath)
References: [_](#_), [resname](#resname), [name](#name)

### resname

![resname](./grammar/resname.svg)

Used by: [respath](#respath), [noparentrespath](#noparentrespath), [parents](#parents), [docs](#docs), [docEntry](#docEntry), [event](#event)

### name

![name](./grammar/name.svg)

Used by: [structure](#structure), [attribute](#attribute), [enum](#enum), [parentrespath](#parentrespath), [parents](#parents), [diagram](#diagram), [fold](#fold), [id](#id)

### filename

![filename](./grammar/filename.svg)

Used by: [ref](#ref), [includeAll](#includeAll), [import](#import)

### description

![description](./grammar/description.svg)

Used by: [structure](#structure), [attribute](#attribute), [enum](#enum), [literal](#literal), [docEntry](#docEntry), [group](#group), [event](#event), [namespacedefinition](#namespacedefinition), [resource](#resource), [subresource](#subresource), [action](#action), [errorcode](#errorcode), [ops](#ops)
References: [_](#_)

### semver

![semver](./grammar/semver.svg)

Used by: [namespacedefinition](#namespacedefinition)

### _

![_](./grammar/_.svg)

Used by: [structure](#structure), [structconstraints](#structconstraints), [minProperties](#minProperties), [maxProperties](#maxProperties), [attributes](#attributes), [attribute](#attribute), [array1](#array1), [modifiers](#modifiers), [constraints](#constraints), [minLength](#minLength), [maxLength](#maxLength), [enum](#enum), [literal](#literal), [ref](#ref), [respath](#respath), [noparentrespath](#noparentrespath), [parentrespath](#parentrespath), [parents](#parents), [description](#description), [docs](#docs), [docEntry](#docEntry), [diagram](#diagram), [layout](#layout), [includeAll](#includeAll), [includes](#includes), [include](#include), [group](#group), [dimports](#dimports), [dimport](#dimport), [excludes](#excludes), [exclude](#exclude), [folds](#folds), [fold](#fold), [event](#event), [header](#header), [payload](#payload), [namespacedefinition](#namespacedefinition), [import](#import), [resource](#resource), [subresource](#subresource), [action](#action), [operations](#operations), [operation](#operation), [errors](#errors), [errorcode](#errorcode), [ops](#ops), [id](#id)
References: [comment](#comment)

### __

![__](./grammar/__.svg)

Used by: [structconstraints](#structconstraints), [attribute](#attribute), [modifiers](#modifiers), [constraints](#constraints)
References: [comment](#comment)

### comment

![comment](./grammar/comment.svg)

Used by: [_](#_), [__](#__)
References: [single](#single), [multi](#multi)

### single

![single](./grammar/single.svg)

Used by: [comment](#comment)

### multi

![multi](./grammar/multi.svg)

Used by: [comment](#comment)

### docs

![docs](./grammar/docs.svg)

Used by: [reslang](#reslang)
References: [_](#_), [resname](#resname), [docEntry](#docEntry)

### docEntry

![docEntry](./grammar/docEntry.svg)

Used by: [docs](#docs)
References: [_](#_), [resname](#resname), [description](#description)

### diagram

![diagram](./grammar/diagram.svg)

Used by: [reslang](#reslang)
References: [_](#_), [name](#name), [layout](#layout), [includeAll](#includeAll), [includes](#includes), [dimports](#dimports), [excludes](#excludes), [folds](#folds), [group](#group)

### layout

![layout](./grammar/layout.svg)

Used by: [diagram](#diagram)
References: [_](#_)

### includeAll

![includeAll](./grammar/includeAll.svg)

Used by: [diagram](#diagram)
References: [_](#_), [filename](#filename)

### includes

![includes](./grammar/includes.svg)

Used by: [diagram](#diagram)
References: [_](#_), [include](#include)

### include

![include](./grammar/include.svg)

Used by: [includes](#includes), [group](#group)
References: [_](#_), [ref](#ref)

### group

![group](./grammar/group.svg)

Used by: [diagram](#diagram)
References: [_](#_), [description](#description), [include](#include)

### dimports

![dimports](./grammar/dimports.svg)

Used by: [diagram](#diagram)
References: [_](#_), [dimport](#dimport)

### dimport

![dimport](./grammar/dimport.svg)

Used by: [dimports](#dimports)
References: [_](#_), [ref](#ref)

### excludes

![excludes](./grammar/excludes.svg)

Used by: [diagram](#diagram)
References: [_](#_), [exclude](#exclude)

### exclude

![exclude](./grammar/exclude.svg)

Used by: [excludes](#excludes)
References: [_](#_), [ref](#ref)

### folds

![folds](./grammar/folds.svg)

Used by: [diagram](#diagram)
References: [_](#_), [fold](#fold)

### fold

![fold](./grammar/fold.svg)

Used by: [folds](#folds)
References: [_](#_), [name](#name), [ref](#ref)

### event

![event](./grammar/event.svg)

Used by: [reslang](#reslang)
References: [_](#_), [description](#description), [resname](#resname), [header](#header), [payload](#payload)

### header

![header](./grammar/header.svg)

Used by: [event](#event)
References: [_](#_), [attributes](#attributes)

### payload

![payload](./grammar/payload.svg)

Used by: [event](#event)
References: [_](#_), [attributes](#attributes)

### reslang

![reslang](./grammar/reslang.svg)

References: [namespacedefinition](#namespacedefinition), [import](#import), [resource](#resource), [subresource](#subresource), [action](#action), [event](#event), [structure](#structure), [enum](#enum), [diagram](#diagram), [docs](#docs)

### namespacedefinition

![namespacedefinition](./grammar/namespacedefinition.svg)

Used by: [reslang](#reslang)
References: [_](#_), [description](#description), [semver](#semver)

### import

![import](./grammar/import.svg)

Used by: [reslang](#reslang)
References: [_](#_), [filename](#filename)

### resource

![resource](./grammar/resource.svg)

Used by: [reslang](#reslang)
References: [_](#_), [description](#description), [noparentrespath](#noparentrespath), [attributes](#attributes), [operations](#operations)

### subresource

![subresource](./grammar/subresource.svg)

Used by: [reslang](#reslang)
References: [_](#_), [description](#description), [parentrespath](#parentrespath), [attributes](#attributes), [operations](#operations)

### action

![action](./grammar/action.svg)

Used by: [reslang](#reslang)
References: [_](#_), [description](#description), [parentrespath](#parentrespath), [attributes](#attributes), [operations](#operations)

### operations

![operations](./grammar/operations.svg)

Used by: [resource](#resource), [subresource](#subresource), [action](#action)
References: [_](#_), [operation](#operation)

### operation

![operation](./grammar/operation.svg)

Used by: [operations](#operations)
References: [_](#_), [ops](#ops), [errors](#errors)

### errors

![errors](./grammar/errors.svg)

Used by: [operation](#operation)
References: [_](#_), [errorcode](#errorcode), [ref](#ref)

### errorcode

![errorcode](./grammar/errorcode.svg)

Used by: [errors](#errors)
References: [_](#_), [description](#description)

### ops

![ops](./grammar/ops.svg)

Used by: [operation](#operation)
References: [_](#_), [description](#description)

### ids

![ids](./grammar/ids.svg)

References: [id](#id)

### id

![id](./grammar/id.svg)

Used by: [ids](#ids)
References: [_](#_), [name](#name)

