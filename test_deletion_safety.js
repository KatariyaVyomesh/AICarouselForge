
const { PrismaClient } = require('@prisma/client')
const { writeFile, unlink, access } = require('fs/promises')
const { existsSync } = require('fs')
const path = require('path')

const prisma = new PrismaClient()
const SHARED_IMG = "test-shared-" + Date.now() + ".png"
const UNIQUE_IMG = "test-unique-" + Date.now() + ".png"
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads")

async function createDummyImage(filename) {
    const filePath = path.join(UPLOADS_DIR, filename)
    // Create a simple 1x1 png or text file (content doesn't matter for deletion)
    await writeFile(filePath, "dummy content")
    return "/uploads/" + filename
}

async function main() {
    try {
        console.log("1. Creating dummy images...")
        const sharedPath = await createDummyImage(SHARED_IMG)
        const uniquePath = await createDummyImage(UNIQUE_IMG)

        console.log("2. Creating BrandKit using shared image...")
        const brandKit = await prisma.brandKit.create({
            data: {
                name: "Test Brand Kit",
                imageUrl: sharedPath
            }
        })
        console.log(`   BrandKit ID: ${brandKit.id}`)

        console.log("3. Creating Project 1 using shared image...")
        const project1 = await prisma.project.create({
            data: {
                topic: "Test Project Shared",
                brandImage: sharedPath,
                slides: {
                    create: []
                }
            }
        })
        console.log(`   Project 1 ID: ${project1.id}`)

        console.log("4. Creating Project 2 using unique image...")
        const project2 = await prisma.project.create({
            data: {
                topic: "Test Project Unique",
                brandImage: uniquePath,
                slides: {
                    create: []
                }
            }
        })
        console.log(`   Project 2 ID: ${project2.id}`)

        // DELETE Project 1 via API (mocking the API logic by calling the fetch to localhost if possible, 
        // OR simply running the deletion logic since we can't easily fetch localhost from here if env not set, 
        // BUT wait, I am in correct environment. Let's try to call the API endpoint using fetch)

        console.log("5. Deleting Project 1 (Shared Image)...")
        const res1 = await fetch(`http://localhost:3000/api/projects/${project1.id}`, {
            method: 'DELETE'
        })
        if (!res1.ok) console.error("Failed to delete project 1", await res1.text())
        else console.log("   Project 1 deleted.")

        // CHECK SHARED IMAGE
        const sharedExists = existsSync(path.join(UPLOADS_DIR, SHARED_IMG))
        if (sharedExists) {
            console.log("   ✅ SUCCESS: Shared image still exists.")
        } else {
            console.error("   ❌ FAILURE: Shared image was deleted!")
        }

        console.log("6. Deleting Project 2 (Unique Image)...")
        const res2 = await fetch(`http://localhost:3000/api/projects/${project2.id}`, {
            method: 'DELETE'
        })
        if (!res2.ok) console.error("Failed to delete project 2", await res2.text())
        else console.log("   Project 2 deleted.")

        // CHECK UNIQUE IMAGE
        // Give it a moment as FS ops might be slightly async in OS (though await unlink should be done)
        const uniqueExists = existsSync(path.join(UPLOADS_DIR, UNIQUE_IMG))
        if (!uniqueExists) {
            console.log("   ✅ SUCCESS: Unique image was deleted.")
        } else {
            console.error("   ❌ FAILURE: Unique image still exists!")
        }

        // CLEANUP
        console.log("7. Cleanup...")
        await prisma.brandKit.delete({ where: { id: brandKit.id } })
        if (sharedExists) await unlink(path.join(UPLOADS_DIR, SHARED_IMG))

    } catch (e) {
        console.error("An error occurred:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
