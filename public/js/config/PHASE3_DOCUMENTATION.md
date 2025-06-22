# SMASHTEROIDS Configuration System - Phase 3

## Runtime Configuration UI

### Overview
Phase 3 introduces a runtime configuration UI that allows real-time tweaking of game parameters during development and testing. This dramatically speeds up game balancing and experimentation.

### Features

#### 1. **In-Game Configuration Panel**
- **Toggle with F9** - Show/hide the configuration UI
- **Draggable window** - Click and drag the header to reposition
- **Categorized settings** - Organized by game systems (SHIP, ASTEROID, ALIEN, etc.)
- **Real-time updates** - Changes apply immediately without restarting

#### 2. **Interactive Controls**
- **Category tabs** - Click to switch between configuration sections
- **Editable values** - Click on any numeric or boolean value to edit
- **Keyboard input** - Type new values, press Enter to apply, Escape to cancel
- **Mouse wheel scrolling** - Scroll through long lists of settings

#### 3. **Management Features**
- **Reset Category** - Revert current category to original values
- **Reset All** - Revert entire configuration to defaults
- **Export** - Copy current configuration to clipboard (also logs to console)

### Usage Instructions

1. **Opening the UI**
   - Press `F9` during gameplay or on any screen
   - The UI appears as a semi-transparent overlay

2. **Editing Values**
   - Click on any value to start editing
   - Type the new value
   - Press `Enter` to apply or `Escape` to cancel
   - Changes take effect immediately

3. **Navigation**
   - Click category tabs to switch sections
   - Use mouse wheel to scroll within a category
   - Drag the window header to reposition

4. **Exporting Configuration**
   - Click the "Export" button
   - Configuration is copied to clipboard
   - Also printed to console for easy access

### Example Workflow

1. **Balancing Ship Movement**
   ```
   - Press F9 to open ConfigUI
   - Click on "SHIP" tab
   - Click on THRUST value
   - Type new value (e.g., 0.8)
   - Press Enter
   - Test ship movement immediately
   ```

2. **Adjusting Difficulty**
   ```
   - Open ConfigUI (F9)
   - Navigate to "ALIEN" tab
   - Increase SPAWN_CHANCE for more aliens
   - Decrease FIRE_RATE for easier gameplay
   - Test changes in real-time
   ```

3. **Creating Custom Configurations**
   ```
   - Make desired changes across categories
   - Click "Export" button
   - Save the JSON to a file
   - Can be loaded later or shared with others
   ```

### Technical Implementation

The ConfigUI is implemented as a standalone class that:
- Integrates seamlessly with the existing game loop
- Directly modifies the global GameConfig object
- Renders using the game's canvas context
- Handles its own input events

### Benefits for Development

1. **Rapid Iteration** - No need to restart the game to test changes
2. **Visual Feedback** - See changes immediately in gameplay
3. **Easy Comparison** - Quick A/B testing of different values
4. **Configuration Sharing** - Export/import configurations easily
5. **Non-Destructive** - Reset buttons prevent permanent mistakes

### Color Coding

Values are color-coded by type for easy identification:
- **Yellow** - Numeric values
- **Purple** - Boolean values
- **Cyan** - String values
- **White** - Object/array values

### Keyboard Shortcuts

- `F9` - Toggle ConfigUI visibility
- `Enter` - Apply current edit
- `Escape` - Cancel current edit
- `Backspace` - Delete character in edit mode

### Future Enhancements

Potential improvements for Phase 4+:
- Save/load configuration presets
- Slider controls for numeric values
- Color picker for color values
- Undo/redo functionality
- Configuration history
- Performance impact indicators
- Multiplayer configuration sync 