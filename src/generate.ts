
export default function generateSwagger(title: string, tree: any[]) {
    const tags: any[] = []
    const swag: object = {
        swagger: "2.0",
        info: {
          title: "Simple API overview",
          description: tree[0].description,
          version: tree[0].version,
        },
        host: "liveramp.net",
        basePath: "/" + title,
        schemes: [ "http", "https" ],
        tags: tags
    }

    // form the tags
    tree[2].forEach((el: any) => {
        if (["resource", "request"].includes(el.type)) {
            tags.push({
                "name": el.name,
                "description": el.comment})
        }
        if (["subresource", "verb"].includes(el.type)) {
            tags.push({
                "name": el.name + " / " + el.parent,
                "description": el.comment})
        }
    })

    return swag
}