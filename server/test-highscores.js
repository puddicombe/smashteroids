/**
 * Test script for the Asteroids high score server
 * 
 * This script tests the high score API endpoints by:
 * 1. Fetching the current high scores
 * 2. Adding a test high score
 * 3. Fetching the scores again to verify the new score was added
 */

const fetch = require('node-fetch');
const assert = require('assert');

const API_URL = 'http://localhost:3000/api/highscores';
const TEST_SCORE = {
    // Use lowercase initials to verify that the server correctly
    // sanitizes and uppercases incoming values
    initials: 'tst',
    // Use a fixed value to simplify testing
    score: 12345,
    gameData: {
        level: 3,
        timestamp: Date.now(),
        timePlayed: 120000 // 2 minutes
    }
};

// The server converts initials to uppercase and strips non A-Z characters.
// Replicate that logic here so we know what to look for in the response.
const EXPECTED_INITIALS = TEST_SCORE.initials.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);

async function testHighScoreAPI() {
    try {
        console.log('Testing Asteroids High Score API...');
        console.log('-----------------------------------');
        
        // Step 1: Fetch current high scores
        console.log('1. Fetching current high scores...');
        const initialResponse = await fetch(API_URL);
        
        if (!initialResponse.ok) {
            throw new Error(`Failed to fetch high scores: ${initialResponse.status} ${initialResponse.statusText}`);
        }
        
        const initialScores = await initialResponse.json();
        console.log(`   Retrieved ${initialScores.length} high scores`);
        console.log('   Top 3 scores:');
        initialScores.slice(0, 3).forEach((score, index) => {
            console.log(`   ${index + 1}. ${score.initials} - ${score.score}`);
        });
        console.log();
        
        // Step 2: Add a test high score
        console.log(`2. Adding test score: ${TEST_SCORE.initials} - ${TEST_SCORE.score}...`);
        const postResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(TEST_SCORE),
        });
        
        if (!postResponse.ok) {
            throw new Error(`Failed to add high score: ${postResponse.status} ${postResponse.statusText}`);
        }
        
        const postResult = await postResponse.json();
        const inserted = Array.isArray(postResult.highScores) &&
            postResult.highScores.find(score =>
                score.initials === EXPECTED_INITIALS &&
                score.score === TEST_SCORE.score
            );
        assert.ok(inserted, 'Posted score not returned by server');
        console.log('   Score added successfully!');
        console.log();
        
        // Step 3: Fetch scores again to verify
        console.log('3. Verifying score was added...');
        const verifyResponse = await fetch(API_URL);
        
        if (!verifyResponse.ok) {
            throw new Error(`Failed to fetch high scores: ${verifyResponse.status} ${verifyResponse.statusText}`);
        }
        
        const updatedScores = await verifyResponse.json();
        console.log(`   Retrieved ${updatedScores.length} high scores`);
        
        // Find our test score
        const foundScore = updatedScores.find(score =>
            score.initials === EXPECTED_INITIALS &&
            score.score === TEST_SCORE.score
        );
        
        if (foundScore) {
            console.log('   ✅ Test score was found in the high scores list!');
            const position = updatedScores.indexOf(foundScore) + 1;
            console.log(`   Position: ${position} of ${updatedScores.length}`);
        } else {
            console.log('   ❌ Test score was NOT found in the high scores list.');
        }
        
        console.log('\nTest completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Make sure the server is running on http://localhost:3000');
        process.exit(1);
    }
}

// Run the test
testHighScoreAPI(); 