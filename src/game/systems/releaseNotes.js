export class ReleaseNotes {
    constructor() {
        this.releases = [
            {
                version: "1.3.0",
                date: "2024-03",
                changes: [
                    "Code refactoring for better maintainability",
                    "Added release notes system",
                    "Improved code organization with modular structure"
                ]
            },
            {
                version: "1.2.0",
                date: "2024-03",
                changes: [
                    "Made smaller asteroids more threatening",
                    "Increased asteroid speed and rotation based on size",
                    "Added progressive difficulty scaling with levels"
                ]
            },
            {
                version: "1.1.0",
                date: "2024-03",
                changes: [
                    "Added server-based high score system",
                    "Increased high score table to show top 15 scores",
                    "Added score submission with player initials"
                ]
            },
            {
                version: "1.0.0",
                date: "2024-03",
                changes: [
                    "Added pause functionality (Press P)",
                    "Limited maximum bullets to 4 on screen",
                    "Updated game instructions",
                    "Added sound effects and music",
                    "Initial game release"
                ]
            }
        ];
    }

    getLatestVersion() {
        return this.releases[0];
    }

    getAllReleases() {
        return this.releases;
    }

    formatForDisplay() {
        return this.releases.map(release => {
            return {
                title: `v${release.version} (${release.date})`,
                content: release.changes.map(change => `• ${change}`).join('\\n')
            };
        });
    }
} 