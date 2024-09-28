
/**
 * @name PinnedDMs
 * @author MBlen01
 * @version 1.0.0
 * @description A plugin to pin DMs and add custom notifications/ringtones.
 * @source https://github.com/MBlen01/BDPlugins
 * @updateUrl https://github.com/MBlen01/BDPlugins/PinnedDMs.plugin.js
 */

module.exports = class PinnedDMs {
    constructor() {
        this.pinnedDMs = BdApi.loadData('PinnedDMs', 'pinnedDMs') || [];
        this.customRingtones = BdApi.loadData('PinnedDMs', 'customRingtones') || {};
        this.lastMessageTimestamps = {};
    }

    start() {
        this.addPinnedDMsUI();
        this.listenForMessages();
        this.listenForPresenceUpdates();
        this.listenForTyping();
        BdApi.showToast("PinnedDMs Plugin Started", { type: "success" });
    }

    stop() {
        const pinnedContainer = document.querySelector("#pinned-dms-list");
        if (pinnedContainer) {
            pinnedContainer.remove();
        }
        BdApi.showToast("PinnedDMs Plugin Stopped", { type: "error" });
    }

    addPinnedDMsUI() {
        const container = document.createElement("div");
        container.id = "pinned-dms-list";
        container.style.position = "absolute";
        container.style.top = "50px";
        container.style.right = "10px";
        container.style.padding = "10px";
        container.style.backgroundColor = "#2C2F33";
        container.style.borderRadius = "5px";
        container.style.zIndex = "9999";
        container.style.maxHeight = "400px";
        container.style.overflowY = "auto";

        const title = document.createElement("h3");
        title.textContent = "Pinned DMs";
        title.style.color = "#fff";
        container.appendChild(title);

        this.pinnedDMs.forEach((dmId) => {
            const dmElement = document.createElement("div");
            dmElement.style.color = "#fff";
            dmElement.textContent = `DM: ${dmId}`; // Placeholder for DM username
            dmElement.id = `dm-${dmId}`;
            dmElement.draggable = true;  // Make the DM element draggable

            // Add drag-and-drop event listeners
            dmElement.addEventListener('dragstart', (e) => this.handleDragStart(e, dmId));
            dmElement.addEventListener('dragover', (e) => this.handleDragOver(e));
            dmElement.addEventListener('drop', (e) => this.handleDrop(e, dmId));

            container.appendChild(dmElement);
        });

        document.body.appendChild(container);
    }

    // Handle drag start
    handleDragStart(e, dmId) {
        e.dataTransfer.setData('text/plain', dmId);
        e.dataTransfer.effectAllowed = 'move';
    }

    // Handle drag over
    handleDragOver(e) {
        e.preventDefault(); // Prevent default to allow drop
        e.dataTransfer.dropEffect = 'move'; // Show the move cursor
    }

    // Handle drop event
    handleDrop(e, targetId) {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');

        // Reorder the pinned DMs
        const draggedIndex = this.pinnedDMs.indexOf(draggedId);
        const targetIndex = this.pinnedDMs.indexOf(targetId);

        if (draggedIndex > -1 && targetIndex > -1) {
            // Remove dragged item and insert it at the new position
            this.pinnedDMs.splice(draggedIndex, 1);
            this.pinnedDMs.splice(targetIndex, 0, draggedId);

            // Update the UI
            this.updatePinnedDMsUI();
            BdApi.saveData('PinnedDMs', 'pinnedDMs', this.pinnedDMs); // Save updated order
        }
    }

    // Update the UI after reordering
    updatePinnedDMsUI() {
        const container = document.querySelector("#pinned-dms-list");
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        this.addPinnedDMsUI();
    }

    listenForMessages() {
        const Dispatcher = BdApi.findModuleByProps("dispatch", "subscribe");
        Dispatcher.subscribe("MESSAGE_CREATE", (event) => {
            const message = event.message;
            if (this.pinnedDMs.includes(message.channel_id)) {
                this.playCustomRingtone(message.author.id);
                this.updateLastMessageTime(message.author.id, message.timestamp);
            }
        });
    }

    listenForPresenceUpdates() {
        const Dispatcher = BdApi.findModuleByProps("dispatch", "subscribe");
        Dispatcher.subscribe("PRESENCE_UPDATE", (event) => {
            const presence = event.presence;
            const userId = presence.userId;
            if (this.pinnedDMs.includes(userId)) {
                this.updateUserStatus(userId, presence.status);
            }
        });
    }

    listenForTyping() {
        const Dispatcher = BdApi.findModuleByProps("dispatch", "subscribe");
        Dispatcher.subscribe("TYPING_START", (event) => {
            const { userId, channelId } = event;
            if (this.pinnedDMs.includes(channelId)) {
                this.showTypingIndicator(userId);
            }
        });
    }

    playCustomRingtone(userId) {
        const ringtoneUrl = this.customRingtones[userId] || "default-ringtone.mp3";
        let audio = new Audio(ringtoneUrl);
        audio.play();
    }

    updateLastMessageTime(userId, timestamp) {
        const currentTime = Date.now();
        const lastMessageTime = new Date(timestamp).getTime();
        const daysAgo = Math.floor((currentTime - lastMessageTime) / (1000 * 60 * 60 * 24));
        this.lastMessageTimestamps[userId] = daysAgo;

        const dmElement = document.querySelector(`#dm-${userId}`);
        if (dmElement) {
            dmElement.textContent = `DM: ${userId} (Last message: ${daysAgo} days ago)`;
        }
    }

    updateUserStatus(userId, status) {
        const dmElement = document.querySelector(`#dm-${userId}`);
        if (dmElement) {
            dmElement.textContent = `DM: ${userId} (Status: ${status})`;
        }
    }

    showTypingIndicator(userId) {
        const dmElement = document.querySelector(`#dm-${userId}`);
        if (dmElement) {
            dmElement.textContent = `DM: ${userId} (Typing...)`;
        }
    }

    getSettingsPanel() {
        const panel = document.createElement("div");
        panel.innerHTML = `
            <h3>Pinned DMs Settings</h3>
            <label>Set custom ringtone URL for a pinned user (example: user123):</label><br>
            <input type="text" id="user-id" placeholder="User ID"><br>
            <input type="text" id="ringtone-url" placeholder="Ringtone URL"><br>
            <button id="save-ringtone">Save Ringtone</button>
        `;

        panel.querySelector("#save-ringtone").onclick = () => {
            const userId = panel.querySelector("#user-id").value;
            const ringtoneUrl = panel.querySelector("#ringtone-url").value;

            if (userId && ringtoneUrl) {
                this.customRingtones[userId] = ringtoneUrl;
                BdApi.saveData('PinnedDMs', 'customRingtones', this.customRingtones);
                BdApi.showToast(`Ringtone saved for ${userId}`, { type: "success" });
            }
        };

        return panel;
    }
};
