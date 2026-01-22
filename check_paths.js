
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const projects = await prisma.project.findMany({
        take: 5,
        include: {
            slides: true
        }
    })

    console.log("Checking projects...")
    for (const p of projects) {
        console.log(`\nProject: ${p.id}`)
        if (p.brandImage) console.log(`  BrandImage: ${JSON.stringify(p.brandImage)}`)
        for (const s of p.slides) {
            if (s.backgroundImageUrl) console.log(`  Slide ${s.id} BG: ${JSON.stringify(s.backgroundImageUrl)}`)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
