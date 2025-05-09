// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// 照片上传API
async function uploadPhoto(file, size) {
    try {
        // 创建本地预览URL
        const localPreviewUrl = URL.createObjectURL(file);

        // 创建FormData对象
        const formData = new FormData();
        formData.append('file', file);

        // 生成唯一ID
        const uniqueId = 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // 显示本地预览
        const tempPhotoInfo = {
            id: uniqueId,
            url: localPreviewUrl,
            name: file.name,
            size: size,
            isUploading: true
        };

        // 返回临时信息用于先显示本地预览
        const previewResult = {
            success: true,
            data: tempPhotoInfo,
            isPreview: true
        };

        // 添加头信息
        const headers = {
        };

        // 调用实际API (这里改为异步上传，不阻塞UI)
        const uploadPromise = fetch('http://localhost:8888/api/photo/upload', {
            method: 'POST',
            headers: headers,
            body: formData
        }).then(async response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const responseJson = await response.json();

            // 检查服务器响应中是否有URL
            if (responseJson && responseJson.data && responseJson.data.url) {
                // 使用服务器返回的URL更新预览图片
                return {
                    success: true,
                    data: {
                        id: uniqueId,
                        url: responseJson.data.url,
                        serverUrl: responseJson.data.url, // 保存服务器URL
                        originalUrl: localPreviewUrl,    // 保存原始URL
                        name: file.name,
                        size: size,
                        isUploading: false
                    }
                };
            } else {
                // 如果服务器没有返回URL，继续使用本地URL
                return {
                    success: true,
                    data: {
                        id: uniqueId,
                        url: localPreviewUrl,
                        name: file.name,
                        size: size,
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
                    size: size,
                    isUploading: false,
                    error: error.message
                },
                message: error.message
            };
        });

        // 保存上传Promise，以便后续可以获取实际上传结果
        tempPhotoInfo.uploadPromise = uploadPromise;

        return previewResult;
    } catch (error) {
        console.error('创建预览失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// 删除照片API
async function apiDeletePhoto(photoId) {
    // 实际项目中可能需要调用真实的删除API
    // 这里暂时使用模拟API
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
        // 转换数据格式为API要求的格式
        const apiData = {
            order_sn: orderData.order_sn,
            remark: orderData.remark,
            receiver: orderData.receiver,
            photos: []
        };

        // 获取当前选中的规格（通过检查哪些尺寸被选中）
        const selectedSizes = [];
        document.querySelectorAll('input[name="sizes"]:checked').forEach(checkbox => {
            selectedSizes.push(checkbox.value);
        });

        // 按照API要求的格式组织照片数据
        // 首先按照尺寸分组
        const photosBySize = {};

        orderData.photos.forEach(photo => {
            // 只处理当前选中的规格的照片
            if (!selectedSizes.includes(photo.size)) {
                return;
            }

            // 从尺寸值（如"3寸-满版"）中提取信息
            const sizeMatch = photo.size.match(/(\d+)寸-(.+)/);
            if (!sizeMatch) return;

            const sizeNumber = parseInt(sizeMatch[1]);
            const type = sizeMatch[2]; // "满版" 或 "留白"

            // 创建规格标识
            const sizeKey = `${sizeNumber}_${type}`;

            if (!photosBySize[sizeKey]) {
                photosBySize[sizeKey] = {
                    spec: photo.size, // 使用完整规格名称
                    urls: []
                };
            }

            // 优先使用服务器URL，如果没有则使用本地URL
            const urlToUse = photo.serverUrl || photo.url;

            // 添加URL到对应尺寸组
            photosBySize[sizeKey].urls.push(urlToUse);
        });

        // 将分组后的数据添加到API数据中
        apiData.photos = Object.values(photosBySize);

        // 添加头信息
        const headers = {
            'Content-Type': 'application/json',
            'Country': 'DE',
            'Lang': 'en'
        };

        // 调用实际API
        const response = await fetch('http://localhost:8888/api/order/submit', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(apiData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // 返回处理后的响应
        return {
            success: true,
            data: {
                order_sn: orderData.order_sn,
                total: orderData.photos.length, // 如果API不返回总数，使用本地计算的总数
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
    // 照片数据存储
    const photoData = {
        sizes: {},
        totalCount: 0
    };

    // 获取DOM元素
    const checkboxes = document.querySelectorAll('input[name="sizes"]');
    const uploadSection = document.getElementById('upload-section');
    const totalPhotoCount = document.getElementById('total-photo-count');
    const submitButton = document.getElementById('submit-button');

    // 确认弹窗相关元素
    const confirmModal = document.getElementById('confirm-modal');
    const confirmDetails = document.getElementById('confirm-details');
    const confirmSubmit = document.getElementById('confirm-submit');
    const cancelSubmit = document.getElementById('cancel-submit');
    const closeButtons = document.querySelectorAll('.close');

    // 结果弹窗相关元素
    const resultModal = document.getElementById('result-modal');
    const resultDetails = document.getElementById('result-details');
    const closeResult = document.getElementById('close-result');

    // 初始化尺寸数据
    checkboxes.forEach(checkbox => {
        const sizeValue = checkbox.value;
        photoData.sizes[sizeValue] = {
            photos: [],
            count: 0
        };
    });

    // 使用防抖处理尺寸选择的变化
    const debouncedUpdateUploadSection = debounce(updateUploadSection, 100);

    // 选择尺寸时的处理
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', debouncedUpdateUploadSection);
    });

    // 更新上传区域
    function updateUploadSection() {
        uploadSection.innerHTML = '';

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const sizeValue = checkbox.value;
                const uploadContainer = createUploadContainer(sizeValue);
                uploadSection.appendChild(uploadContainer);
            }
        });
    }

    // 创建上传容器
    function createUploadContainer(sizeValue) {
        const container = document.createElement('div');
        container.className = 'upload-container';
        container.id = `upload-container-${sizeValue.replace(/[^a-zA-Z0-9]/g, '-')}`;

        const titleArea = document.createElement('div');
        titleArea.className = 'upload-header';

        const title = document.createElement('h3');
        title.textContent = `${sizeValue} 照片上传`;

        const countDisplay = document.createElement('span');
        countDisplay.className = 'spec-photo-count';
        countDisplay.id = `spec-count-${sizeValue.replace(/[^a-zA-Z0-9]/g, '-')}`;
        countDisplay.textContent = '已上传: 0张';

        titleArea.appendChild(title);
        titleArea.appendChild(countDisplay);

        const uploadArea = document.createElement('div');
        uploadArea.className = 'upload-area';

        const uploadLabel = document.createElement('span');
        uploadLabel.className = 'upload-label';
        uploadLabel.textContent = '点击或拖拽照片到此处上传';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'image/*';
        fileInput.setAttribute('data-size', sizeValue);
        fileInput.addEventListener('change', handleFileUpload);

        const previewContainer = document.createElement('div');
        previewContainer.className = 'photo-preview';
        previewContainer.id = `preview-${sizeValue.replace(/[^a-zA-Z0-9]/g, '-')}`;

        // 添加已有照片的预览
        if (photoData.sizes[sizeValue] && photoData.sizes[sizeValue].photos.length > 0) {
            photoData.sizes[sizeValue].photos.forEach(photo => {
                const photoItem = createPhotoItem(photo, sizeValue);
                previewContainer.appendChild(photoItem);
            });
        }

        uploadArea.appendChild(uploadLabel);
        uploadArea.appendChild(fileInput);

        container.appendChild(titleArea);
        container.appendChild(uploadArea);
        container.appendChild(previewContainer);

        // 更新该规格的照片计数
        updatePhotoCount(sizeValue);

        return container;
    }

    // 处理文件上传 - 优化批量处理
    async function handleFileUpload(event) {
        const files = event.target.files;
        const sizeValue = event.target.getAttribute('data-size');

        if (files.length === 0) return;

        const sizeData = photoData.sizes[sizeValue];
        const previewContainer = document.getElementById(`preview-${sizeValue.replace(/[^a-zA-Z0-9]/g, '-')}`);

        // 创建文档片段，优化DOM操作
        const fragment = document.createDocumentFragment();

        // 批量处理文件上传
        const fileArray = Array.from(files);
        const uploadPromises = [];

        for (const file of fileArray) {
            // 检查文件是否为图片
            if (!file.type.match('image.*')) {
                continue;
            }

            try {
                // 调用上传API获取预览信息
                const previewResponse = await uploadPhoto(file, sizeValue);

                if (previewResponse.success) {
                    const photoInfo = previewResponse.data;

                    // 将照片添加到数据中
                    sizeData.photos.push(photoInfo);

                    // 添加预览到文档片段
                    const photoItem = createPhotoItem(photoInfo, sizeValue);
                    fragment.appendChild(photoItem);

                    // 如果是预览模式，收集上传Promise
                    if (previewResponse.isPreview && photoInfo.uploadPromise) {
                        photoItem.classList.add('uploading');
                        uploadPromises.push({
                            promise: photoInfo.uploadPromise,
                            photoItem,
                            photoInfo
                        });
                    }
                }
            } catch (error) {
                console.error('上传出错:', error);
            }
        }

        // 一次性将所有预览添加到DOM
        previewContainer.appendChild(fragment);

        // 更新计数
        sizeData.count = sizeData.photos.length;
        updatePhotoCount(sizeValue);

        // 处理所有上传的Promise
        if (uploadPromises.length > 0) {
            Promise.all(uploadPromises.map(item => item.promise))
                .then(results => {
                    results.forEach((result, index) => {
                        const { photoItem, photoInfo } = uploadPromises[index];

                        if (result.success) {
                            // 更新数据
                            Object.assign(photoInfo, result.data);

                            // 如果URL发生了变化，更新图片src
                            if (result.data.url !== photoInfo.url) {
                                const img = photoItem.querySelector('img');
                                if (img) {
                                    img.src = result.data.url;
                                }
                            }
                        } else {
                            // 上传失败处理
                            photoItem.classList.add('upload-failed');

                            // 添加重试按钮
                            const retryButton = document.createElement('button');
                            retryButton.className = 'retry-upload';
                            retryButton.textContent = '重试';
                            retryButton.addEventListener('click', () => {
                                // 从数组中移除照片
                                const photoIndex = sizeData.photos.findIndex(p => p.id === photoInfo.id);
                                if (photoIndex !== -1) {
                                    sizeData.photos.splice(photoIndex, 1);
                                    sizeData.count = sizeData.photos.length;
                                    updatePhotoCount(sizeValue);
                                }

                                // 移除预览
                                photoItem.remove();

                                // 重新上传
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.multiple = false;
                                input.addEventListener('change', function() {
                                    if (this.files.length > 0) {
                                        const newFile = this.files[0];
                                        handleSingleFileUpload(newFile, sizeValue);
                                    }
                                });
                                input.click();
                            });

                            photoItem.appendChild(retryButton);
                        }

                        // 移除上传中样式
                        photoItem.classList.remove('uploading');
                    });
                });
        }

        // 清空文件输入，以便可以上传相同的文件
        event.target.value = null;
    }

    // 处理单个文件上传（用于重试）
    async function handleSingleFileUpload(file, sizeValue) {
        const sizeData = photoData.sizes[sizeValue];
        const previewContainer = document.getElementById(`preview-${sizeValue.replace(/[^a-zA-Z0-9]/g, '-')}`);

        try {
            // 调用上传API
            const response = await uploadPhoto(file, sizeValue);

            if (response.success) {
                const photoInfo = response.data;

                // 将照片添加到数据中
                sizeData.photos.push(photoInfo);
                sizeData.count = sizeData.photos.length;

                // 更新计数
                updatePhotoCount(sizeValue);

                // 添加预览
                const photoItem = createPhotoItem(photoInfo, sizeValue);
                previewContainer.appendChild(photoItem);

                // 如果是预览模式，处理类似上面的逻辑
                if (response.isPreview && photoInfo.uploadPromise) {
                    // 处理与上面相同...
                }
            } else {
                alert(`上传失败: ${response.message || '未知错误'}`);
            }
        } catch (error) {
            console.error('上传出错:', error);
            alert('上传过程中发生错误，请重试！');
        }
    }

    // 创建照片预览项
    function createPhotoItem(photoData, sizeValue) {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.id = photoData.id;

        // 如果是上传中状态，添加对应类名
        if (photoData.isUploading) {
            photoItem.classList.add('uploading');
        }

        const img = document.createElement('img');
        img.src = photoData.url;
        img.alt = photoData.name;

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-photo';
        deleteButton.innerHTML = '&times;';
        deleteButton.addEventListener('click', function() {
            deletePhoto(photoData.id, sizeValue);
        });

        photoItem.appendChild(img);
        photoItem.appendChild(deleteButton);

        return photoItem;
    }

    // 删除照片
    async function deletePhoto(photoId, sizeValue) {
        const sizeData = photoData.sizes[sizeValue];
        const photoIndex = sizeData.photos.findIndex(photo => photo.id === photoId);

        if (photoIndex !== -1) {
            try {
                // 调用删除API
                const response = await apiDeletePhoto(photoId);

                if (response.success) {
                    // 从数组中移除照片
                    sizeData.photos.splice(photoIndex, 1);
                    sizeData.count = sizeData.photos.length;

                    // 移除预览
                    const photoItem = document.getElementById(photoId);
                    if (photoItem) {
                        photoItem.remove();
                    }

                    // 更新计数
                    updatePhotoCount(sizeValue);
                } else {
                    alert(`删除失败: ${response.message || '未知错误'}`);
                }
            } catch (error) {
                console.error('删除出错:', error);
                alert('删除过程中发生错误，请重试！');
            }
        }
    }

    // 更新照片计数
    function updatePhotoCount(sizeValue) {
        const sizeData = photoData.sizes[sizeValue];

        // 更新规格选项里的计数
        const optionCountElement = document.getElementById(`count-${sizeValue.replace(/[^a-zA-Z0-9]/g, '-')}`);
        if (optionCountElement) {
            optionCountElement.textContent = `${sizeData.count}张`;
        }

        // 更新规格容器里的计数
        const specCountElement = document.getElementById(`spec-count-${sizeValue.replace(/[^a-zA-Z0-9]/g, '-')}`);
        if (specCountElement) {
            specCountElement.textContent = `已上传: ${sizeData.count}张`;
        }

        // 更新总计数
        updateTotalCount();
    }

    // 更新总照片计数
    function updateTotalCount() {
        let total = 0;

        Object.values(photoData.sizes).forEach(sizeData => {
            total += sizeData.count;
        });

        photoData.totalCount = total;
        totalPhotoCount.textContent = total;
    }

    // 提交按钮点击事件
    submitButton.addEventListener('click', function() {
        // 检查是否有上传的照片
        if (photoData.totalCount === 0) {
            alert('请至少上传一张照片！');
            return;
        }

        // 准备确认弹窗内容
        confirmDetails.innerHTML = '';

        // 添加表单信息
        const orderSn = document.getElementById('order_sn').value;
        const receiver = document.getElementById('receiver').value;

        if (!orderSn || !receiver) {
            alert('请填写订单号和收货人信息！');
            return;
        }

        const formInfo = document.createElement('div');
        formInfo.innerHTML = `
            <p><strong>订单号：</strong>${orderSn}</p>
            <p><strong>收货人：</strong>${receiver}</p>
        `;
        confirmDetails.appendChild(formInfo);

        // 添加尺寸信息
        const sizeInfo = document.createElement('div');
        sizeInfo.className = 'size-summary';
        sizeInfo.innerHTML = '<h3>照片尺寸与数量：</h3>';

        const sizeList = document.createElement('ul');

        Object.entries(photoData.sizes).forEach(([size, data]) => {
            if (data.count > 0) {
                const listItem = document.createElement('li');
                listItem.textContent = `${size}: ${data.count}张`;
                sizeList.appendChild(listItem);
            }
        });

        sizeInfo.appendChild(sizeList);
        confirmDetails.appendChild(sizeInfo);

        // 添加总数
        const totalInfo = document.createElement('p');
        totalInfo.className = 'total-summary';
        totalInfo.innerHTML = `<strong>总计：</strong>${photoData.totalCount}张照片`;
        confirmDetails.appendChild(totalInfo);

        // 显示确认弹窗
        confirmModal.style.display = 'block';
    });

    // 确认提交事件
    confirmSubmit.addEventListener('click', async function() {
        // 关闭确认弹窗
        confirmModal.style.display = 'none';

        // 获取表单数据
        const orderSn = document.getElementById('order_sn').value;
        const receiver = document.getElementById('receiver').value;
        const remark = document.getElementById('remark').value;

        // 准备要提交的数据
        const submitData = {
            order_sn: orderSn,
            receiver: receiver,
            remark: remark,
            photos: []
        };

        // 添加照片数据
        Object.entries(photoData.sizes).forEach(([size, data]) => {
            if (data.count > 0) {
                data.photos.forEach(photo => {
                    submitData.photos.push({
                        size: size,
                        url: photo.url,
                        serverUrl: photo.serverUrl,
                        id: photo.id
                    });
                });
            }
        });

        try {
            // 显示加载中状态
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'loading-message';
            loadingMessage.textContent = '提交中，请稍候...';
            document.body.appendChild(loadingMessage);

            // 调用提交API
            const response = await submitOrder(submitData);

            // 移除加载中状态
            document.body.removeChild(loadingMessage);

            if (response.success) {
                // 显示结果弹窗
                resultDetails.innerHTML = `
                    <p>您的订单已成功提交！</p>
                    <p>总共上传了 ${response.data.total} 张照片。</p>
                `;
                resultModal.style.display = 'block';
            } else {
                alert(`提交失败: ${response.message || '未知错误'}`);
            }
        } catch (error) {
            console.error('提交出错:', error);
            alert('提交过程中发生错误，请重试！');
        }
    });

    // 取消提交事件
    cancelSubmit.addEventListener('click', function() {
        confirmModal.style.display = 'none';
    });

    // 关闭结果弹窗事件
    closeResult.addEventListener('click', function() {
        resultModal.style.display = 'none';
    });

    // 关闭按钮事件
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // 点击模态框背景时关闭
    window.addEventListener('click', function(event) {
        if (event.target === confirmModal) {
            confirmModal.style.display = 'none';
        } else if (event.target === resultModal) {
            resultModal.style.display = 'none';
        }
    });
});
