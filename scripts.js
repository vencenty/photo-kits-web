// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 照片上传API
async function uploadPhoto(file, sizeType) {
    try {
        // 创建本地预览URL - 确保URL是唯一的
        const localPreviewUrl = URL.createObjectURL(file);

        // 创建FormData对象
        const formData = new FormData();
        formData.append('file', file);
        formData.append('size', sizeType); // 添加规格信息

        // 生成唯一ID
        const uniqueId = 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // 创建临时照片信息用于预览
        const photoInfo = {
            id: uniqueId,
            url: localPreviewUrl,
            name: file.name,
            sizeType: sizeType,
            isUploading: true,
            timestamp: Date.now() // 添加时间戳确保唯一性
        };

        // 添加头信息
        const headers = {
            'Country': 'DE',
            'Lang': 'en'
        };

        // 执行上传
        const uploadPromise = fetch('http://localhost:8888/api/photo/upload', {
            method: 'POST',
            headers: headers,
            body: formData
        }).then(async response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const responseJson = await response.json();
            
            if (responseJson && responseJson.data && responseJson.data.url) {
                // 如果服务器返回了URL，更新照片信息
                const serverUrl = responseJson.data.url + '?t=' + Date.now(); // 添加时间戳避免缓存
                
                return {
                    success: true,
                    data: {
                        id: uniqueId,
                        url: serverUrl,
                        serverUrl: serverUrl,
                        originalUrl: localPreviewUrl,
                        name: file.name,
                        sizeType: sizeType,
                        isUploading: false
                    }
                };
            } else {
                // 服务器没有返回URL，使用本地URL
                return {
                    success: true,
                    data: {
                        id: uniqueId,
                        url: localPreviewUrl,
                        name: file.name,
                        sizeType: sizeType,
                        isUploading: false
                    }
                };
            }
        }).catch(error => {
            console.error('上传失败:', error);
            return {
                success: false,
                data: {
                    id: uniqueId,
                    url: localPreviewUrl,
                    name: file.name,
                    sizeType: sizeType,
                    isUploading: false,
                    error: error.message
                },
                message: error.message
            };
        });

        return {
            photoInfo,
            uploadPromise
        };
    } catch (error) {
        console.error('创建预览失败:', error);
        throw error;
    }
}

// 删除照片API
async function apiDeletePhoto(photoId) {
    // 模拟API
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                message: '删除成功'
            });
        }, 300);
    });
}

// 订单提交API
async function submitOrder(orderData) {
    try {
        // 转换为API要求的格式
        const apiData = {
            order_sn: orderData.order_sn,
            remark: orderData.remark,
            receiver: orderData.receiver,
            photos: []
        };

        // 获取选中的规格
        const selectedSizes = [];
        document.querySelectorAll('input[name="sizes"]:checked').forEach(checkbox => {
            selectedSizes.push(checkbox.value);
        });

        // 按规格分组照片
        const photosBySize = {};
        
        orderData.photos.forEach(photo => {
            if (!selectedSizes.includes(photo.sizeType)) return; // 只处理选中规格
            
            const sizeKey = photo.sizeType;
            
            if (!photosBySize[sizeKey]) {
                photosBySize[sizeKey] = {
                    spec: photo.sizeType,
                    urls: []
                };
            }
            
            // 优先使用服务器URL
            const urlToUse = photo.serverUrl || photo.url;
            photosBySize[sizeKey].urls.push(urlToUse);
        });
        
        apiData.photos = Object.values(photosBySize);

        // 请求头
        const headers = {
            'Content-Type': 'application/json',
            'Country': 'DE',
            'Lang': 'en'
        };

        // 调用API
        const response = await fetch('http://localhost:8888/api/order/submit', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(apiData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        return {
            success: true,
            data: {
                order_sn: orderData.order_sn,
                total: orderData.photos.length,
                receiver: orderData.receiver,
                timestamp: Date.now()
            },
            message: '订单提交成功'
        };
    } catch (error) {
        console.error('提交失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 主应用状态
    const appState = {
        photos: {}, // 按规格存储照片
        totalCount: 0, // 总照片数
        selectedSizes: new Set() // 选中的规格
    };

    // DOM元素
    const elements = {
        checkboxes: document.querySelectorAll('input[name="sizes"]'),
        uploadSection: document.getElementById('upload-section'),
        totalPhotoCount: document.getElementById('total-photo-count'),
        submitButton: document.getElementById('submit-button'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmDetails: document.getElementById('confirm-details'),
        confirmSubmit: document.getElementById('confirm-submit'),
        cancelSubmit: document.getElementById('cancel-submit'),
        closeButtons: document.querySelectorAll('.close'),
        resultModal: document.getElementById('result-modal'),
        resultDetails: document.getElementById('result-details'),
        closeResult: document.getElementById('close-result')
    };

    // 初始化
    initializeApp();

    // 初始化应用
    function initializeApp() {
        // 初始化照片存储
        elements.checkboxes.forEach(checkbox => {
            const sizeType = checkbox.value;
            appState.photos[sizeType] = [];
        });

        // 绑定尺寸选择事件
        elements.checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                handleSizeChange(this);
            });
        });

        // 绑定提交按钮事件
        elements.submitButton.addEventListener('click', showConfirmation);
        
        // 绑定确认提交事件
        elements.confirmSubmit.addEventListener('click', submitPhotos);
        
        // 绑定取消提交事件
        elements.cancelSubmit.addEventListener('click', hideConfirmation);
        
        // 绑定关闭结果事件
        elements.closeResult.addEventListener('click', hideResult);
        
        // 绑定关闭按钮事件
        elements.closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });
        
        // 点击模态框背景关闭
        window.addEventListener('click', function(event) {
            if (event.target === elements.confirmModal) {
                hideConfirmation();
            } else if (event.target === elements.resultModal) {
                hideResult();
            }
        });
    }

    // 处理尺寸选择变化
    function handleSizeChange(checkbox) {
        const sizeType = checkbox.value;
        
        if (checkbox.checked) {
            appState.selectedSizes.add(sizeType);
            createUploadContainer(sizeType);
        } else {
            appState.selectedSizes.delete(sizeType);
            removeUploadContainer(sizeType);
        }
        
        updateTotalCount();
    }

    // 创建上传容器
    function createUploadContainer(sizeType) {
        // 检查容器是否已存在
        const existingContainer = document.getElementById(`container-${sizeType}`);
        if (existingContainer) return;
        
        // 创建容器
        const container = document.createElement('div');
        container.className = 'upload-container';
        container.id = `container-${sizeType}`;
        
        // 创建标题区域
        const titleArea = document.createElement('div');
        titleArea.className = 'upload-header';
        
        const title = document.createElement('h3');
        title.textContent = `${sizeType} 照片上传`;
        
        const countDisplay = document.createElement('span');
        countDisplay.className = 'spec-photo-count';
        countDisplay.id = `count-${sizeType}`;
        countDisplay.textContent = `已上传：${appState.photos[sizeType] ? appState.photos[sizeType].length : 0}张`;
        
        titleArea.appendChild(title);
        titleArea.appendChild(countDisplay);
        
        // 创建上传区域
        const uploadArea = document.createElement('div');
        uploadArea.className = 'upload-area';
        
        const uploadLabel = document.createElement('span');
        uploadLabel.className = 'upload-label';
        uploadLabel.textContent = '点击或拖拽照片到此处上传';
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'image/*';
        fileInput.dataset.sizeType = sizeType;
        fileInput.addEventListener('change', function() {
            handleFileSelect(this.files, sizeType);
            this.value = null; // 重置，允许上传相同文件
        });
        
        uploadArea.appendChild(uploadLabel);
        uploadArea.appendChild(fileInput);
        
        // 创建预览区域
        const previewArea = document.createElement('div');
        previewArea.className = 'photo-preview';
        previewArea.id = `preview-${sizeType}`;
        
        // 如果已有照片，添加到预览区
        if (appState.photos[sizeType] && appState.photos[sizeType].length > 0) {
            appState.photos[sizeType].forEach(photo => {
                const photoElement = createPhotoElement(photo);
                previewArea.appendChild(photoElement);
            });
        }
        
        container.appendChild(titleArea);
        container.appendChild(uploadArea);
        container.appendChild(previewArea);
        
        elements.uploadSection.appendChild(container);
    }

    // 移除上传容器
    function removeUploadContainer(sizeType) {
        const container = document.getElementById(`container-${sizeType}`);
        if (container) {
            container.remove();
        }
    }

    // 处理文件选择
    async function handleFileSelect(files, sizeType) {
        if (files.length === 0) return;
        
        const previewArea = document.getElementById(`preview-${sizeType}`);
        if (!previewArea) {
            console.error(`预览区域未找到: ${sizeType}`);
            return;
        }
        
        // 使用一个文档片段提高性能
        const fragment = document.createDocumentFragment();
        const uploadPromises = [];
        const newPhotos = [];
        
        // 处理每个文件
        for (const file of Array.from(files)) {
            if (!file.type.match('image.*')) continue;
            
            try {
                // 上传照片
                const { photoInfo, uploadPromise } = await uploadPhoto(file, sizeType);
                
                // 保存照片信息
                newPhotos.push(photoInfo);
                
                // 创建预览元素
                const photoElement = createPhotoElement(photoInfo);
                fragment.appendChild(photoElement);
                
                // 添加上传中状态
                photoElement.classList.add('uploading');
                
                // 收集Promise
                uploadPromises.push({ uploadPromise, photoInfo, photoElement });
                
                // 打印日志确认URL是唯一的
                console.log(`文件名: ${file.name}, 预览URL: ${photoInfo.url}`);
            } catch (error) {
                console.error('处理文件失败:', error);
            }
        }
        
        // 添加所有新照片到预览区
        previewArea.appendChild(fragment);
        
        // 添加照片到状态
        appState.photos[sizeType] = appState.photos[sizeType] || [];
        appState.photos[sizeType].push(...newPhotos);
        
        // 更新计数
        updatePhotoCount(sizeType);
        
        // 处理上传Promise
        if (uploadPromises.length > 0) {
            Promise.all(uploadPromises.map(item => item.uploadPromise))
                .then(results => {
                    results.forEach((result, index) => {
                        const { photoInfo, photoElement } = uploadPromises[index];
                        
                        // 移除上传中状态
                        photoElement.classList.remove('uploading');
                        
                        if (result.success) {
                            // 更新照片信息
                            Object.assign(photoInfo, result.data);
                            
                            // 更新图片源 - 确保URL带有时间戳
                            const img = photoElement.querySelector('img');
                            if (img && result.data.url) {
                                const uniqueUrl = result.data.url.includes('?') 
                                    ? result.data.url 
                                    : result.data.url + '?t=' + Date.now();
                                
                                img.src = uniqueUrl;
                                console.log(`更新图片，ID: ${photoInfo.id}, 新URL: ${uniqueUrl}`);
                            }
                        } else {
                            // 标记上传失败
                            photoElement.classList.add('upload-failed');
                            
                            // 添加重试按钮
                            const retryButton = document.createElement('button');
                            retryButton.className = 'retry-button';
                            retryButton.textContent = '重试';
                            retryButton.addEventListener('click', () => {
                                retryUpload(photoInfo, sizeType);
                            });
                            
                            photoElement.appendChild(retryButton);
                        }
                    });
                });
        }
    }

    // 重试上传
    function retryUpload(photoInfo, sizeType) {
        // 创建文件选择器
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.addEventListener('change', async function() {
            if (this.files.length === 0) return;
            
            // 获取新文件
            const file = this.files[0];
            
            // 删除原照片
            deletePhoto(photoInfo.id, sizeType);
            
            // 上传新文件
            handleFileSelect([file], sizeType);
        });
        
        // 触发文件选择
        input.click();
    }

    // 创建照片元素
    function createPhotoElement(photoInfo) {
        const photoElement = document.createElement('div');
        photoElement.className = 'photo-item';
        photoElement.id = photoInfo.id;
        photoElement.dataset.sizeType = photoInfo.sizeType;
        
        const img = document.createElement('img');
        // 添加时间戳参数以避免浏览器缓存同一URL的图片
        const imageUrl = photoInfo.url.includes('?') ? photoInfo.url : photoInfo.url + '?t=' + Date.now();
        img.src = imageUrl;
        img.alt = photoInfo.name;
        img.dataset.originalUrl = photoInfo.url; // 保存原始URL以便调试
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-photo';
        deleteButton.innerHTML = '&times;';
        deleteButton.addEventListener('click', function() {
            deletePhoto(photoInfo.id, photoInfo.sizeType);
        });
        
        photoElement.appendChild(img);
        photoElement.appendChild(deleteButton);
        
        return photoElement;
    }

    // 删除照片
    async function deletePhoto(photoId, sizeType) {
        // 从DOM中移除
        const photoElement = document.getElementById(photoId);
        if (photoElement) {
            photoElement.remove();
        }
        
        // 从状态中移除
        if (appState.photos[sizeType]) {
            const index = appState.photos[sizeType].findIndex(p => p.id === photoId);
            if (index !== -1) {
                appState.photos[sizeType].splice(index, 1);
                updatePhotoCount(sizeType);
            }
        }
        
        // 调用删除API
        try {
            await apiDeletePhoto(photoId);
        } catch (error) {
            console.error('删除照片失败:', error);
        }
    }

    // 更新照片计数
    function updatePhotoCount(sizeType) {
        const count = appState.photos[sizeType] ? appState.photos[sizeType].length : 0;
        
        // 更新规格计数
        const countElement = document.getElementById(`count-${sizeType}`);
        if (countElement) {
            countElement.textContent = `已上传：${count}张`;
        }
        
        // 更新总计数
        updateTotalCount();
    }

    // 更新总照片计数
    function updateTotalCount() {
        let total = 0;
        
        // 只计算选中规格的照片
        appState.selectedSizes.forEach(sizeType => {
            if (appState.photos[sizeType]) {
                total += appState.photos[sizeType].length;
            }
        });
        
        appState.totalCount = total;
        elements.totalPhotoCount.textContent = total;
    }

    // 显示确认弹窗
    function showConfirmation() {
        // 检查是否有上传照片
        if (appState.totalCount === 0) {
            alert('请至少上传一张照片！');
            return;
        }
        
        // 获取表单信息
        const orderSn = document.getElementById('order_sn').value;
        const receiver = document.getElementById('receiver').value;
        
        if (!orderSn || !receiver) {
            alert('请填写订单号和收货人信息！');
            return;
        }
        
        // 创建确认内容
        elements.confirmDetails.innerHTML = '';
        
        // 添加表单信息
        const formInfo = document.createElement('div');
        formInfo.innerHTML = `
            <p><strong>订单号：</strong>${orderSn}</p>
            <p><strong>收货人：</strong>${receiver}</p>
        `;
        elements.confirmDetails.appendChild(formInfo);
        
        // 添加规格信息
        const sizeInfo = document.createElement('div');
        sizeInfo.className = 'size-summary';
        sizeInfo.innerHTML = '<h3>照片尺寸与数量：</h3>';
        
        const sizeList = document.createElement('ul');
        
        appState.selectedSizes.forEach(sizeType => {
            const count = appState.photos[sizeType] ? appState.photos[sizeType].length : 0;
            if (count > 0) {
                const listItem = document.createElement('li');
                listItem.textContent = `${sizeType}: ${count}张`;
                sizeList.appendChild(listItem);
            }
        });
        
        sizeInfo.appendChild(sizeList);
        elements.confirmDetails.appendChild(sizeInfo);
        
        // 添加总数
        const totalInfo = document.createElement('p');
        totalInfo.className = 'total-summary';
        totalInfo.innerHTML = `<strong>总计：</strong>${appState.totalCount}张照片`;
        elements.confirmDetails.appendChild(totalInfo);
        
        // 显示弹窗
        elements.confirmModal.style.display = 'block';
    }

    // 隐藏确认弹窗
    function hideConfirmation() {
        elements.confirmModal.style.display = 'none';
    }

    // 隐藏结果弹窗
    function hideResult() {
        elements.resultModal.style.display = 'none';
    }

    // 提交照片
    async function submitPhotos() {
        hideConfirmation();
        
        // 获取表单数据
        const orderSn = document.getElementById('order_sn').value;
        const receiver = document.getElementById('receiver').value;
        const remark = document.getElementById('remark').value;
        
        // 准备提交数据
        const submitData = {
            order_sn: orderSn,
            receiver: receiver,
            remark: remark,
            photos: []
        };
        
        // 收集所有照片
        appState.selectedSizes.forEach(sizeType => {
            if (appState.photos[sizeType] && appState.photos[sizeType].length > 0) {
                appState.photos[sizeType].forEach(photo => {
                    submitData.photos.push({
                        size: sizeType,
                        url: photo.url,
                        serverUrl: photo.serverUrl,
                        id: photo.id
                    });
                });
            }
        });
        
        try {
            // 显示加载状态
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'loading-message';
            loadingMessage.textContent = '提交中，请稍候...';
            document.body.appendChild(loadingMessage);
            
            // 调用提交API
            const response = await submitOrder(submitData);
            
            // 移除加载状态
            document.body.removeChild(loadingMessage);
            
            if (response.success) {
                // 显示结果
                elements.resultDetails.innerHTML = `
                    <p>您的订单已成功提交！</p>
                    <p>总共上传了 ${response.data.total} 张照片。</p>
                `;
                elements.resultModal.style.display = 'block';
            } else {
                alert(`提交失败: ${response.message || '未知错误'}`);
            }
        } catch (error) {
            console.error('提交出错:', error);
            alert('提交过程中发生错误，请重试！');
        }
    }
});
