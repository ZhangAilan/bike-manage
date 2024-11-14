<template>
    <div class="ol-popup">
        <a href="#" class="ol-popup-closer" @click.prevent="closePopup"></a>
        <div class="popup-content">
            <div v-if="isEditing" class="popup-form">
                <input type="text" v-model="text" placeholder="添加描述文字">
                <input type="file" ref="fileInput" accept="image/*" style="display: none" @change="handleImageUpload">
                <button @click="saveContent">保存</button>
            </div>
            <div v-else class="popup-display">
                <p v-if="text">{{ text }}</p>
                <button class="edit-btn" @click="startEditing">编辑</button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'MapPopup',
    data() {
        return {
            text: '',
            imageUrl: '',
            isEditing: true
        }
    },
    methods: {
        closePopup() {
            this.$emit('close');
        },
        handleImageUpload(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.imageUrl = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        },
        saveContent() {
            this.isEditing = false;
            this.$emit('save', {
                text: this.text,
                imageUrl: this.imageUrl
            });
        },
        startEditing() {
            this.isEditing = true;
        }
    }
}
</script>

<style scoped>
.ol-popup {
    position: absolute;
    background-color: white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    padding: 15px;
    border-radius: 10px;
    border: 1px solid #cccccc;
    bottom: 12px;
    left: -50px;
    min-width: 280px;
}

.ol-popup-closer {
    text-decoration: none;
    position: absolute;
    top: 2px;
    right: 8px;
}

.ol-popup-closer:after {
    content: "✖";
}

.popup-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.popup-form input[type="text"] {
    padding: 5px;
    width: 100%;
}

.popup-form button {
    padding: 5px 10px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.popup-form button:hover {
    background-color: #45a049;
}

.popup-display {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.edit-btn {
    align-self: flex-end;
    padding: 5px 10px;
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.edit-btn:hover {
    background-color: #1976D2;
}
</style>