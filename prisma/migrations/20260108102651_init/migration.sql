-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "themeId" TEXT NOT NULL DEFAULT 'dark',
    "themeBackground" TEXT NOT NULL DEFAULT '#0f172a',
    "themeText" TEXT NOT NULL DEFAULT '#f1f5f9',
    "themeAccent" TEXT NOT NULL DEFAULT '#3b82f6',
    "themeHeading" TEXT NOT NULL DEFAULT '#ffffff',
    "themeName" TEXT NOT NULL DEFAULT 'Dark',
    "brandName" TEXT,
    "brandHandle" TEXT,
    "brandImage" TEXT
);

-- CreateTable
CREATE TABLE "Slide" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "bodyShort" TEXT,
    "bodyLong" TEXT,
    "suggestedImage" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'educational',
    "minTextVersion" TEXT NOT NULL DEFAULT '',
    "maxTextVersion" TEXT NOT NULL DEFAULT '',
    "backgroundImageUrl" TEXT,
    "layout" TEXT,
    "useExtendedDescription" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Slide_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Slide_projectId_idx" ON "Slide"("projectId");
