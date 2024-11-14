import * as THREE from 'three';

//添加一个绿色的立方体到地图上
export function addCubeToMap() {
    // 获取容器元素
    const mapElement = document.getElementById('map');

    // 创建三维场景
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, mapElement.clientWidth / mapElement.clientHeight, 0.1, 1000);  // 透视相机
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(mapElement.clientWidth, mapElement.clientHeight);
    mapElement.appendChild(renderer.domElement);
    console.log("add renderer");

    // 定义一个正方体模型并加载
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.x = 0;
    scene.add(cube);
    console.log("add cube");

    // 设置相机位置
    camera.position.z = 5;  // 5: 远离原点5个单位

    // 旋转和移动控制变量
    let rotateSpeed = 0.5; // 旋转速度
    let moveSpeed = 0.5; // 移动速度

    // 处理键盘输入
    window.addEventListener('keydown', (event) => {
        if (cube) { // 确保 cube 已经被加载
            switch(event.key) {
                case 'w': // 'w'键，向前移动
                    cube.position.z -= moveSpeed;
                    console.log("向前移动");
                    break;
                case 's': // 's'键，向后移动
                    cube.position.z += moveSpeed;
                    console.log("向后移动");
                    break;
                case 'a': // 'a'键，向左移动
                    cube.position.x -= moveSpeed;
                    console.log("向左移动");
                    break;
                case 'd': // 'd'键，向右移动
                    cube.position.x += moveSpeed;
                    console.log("向右移动");
                    break;
                case 'q': // 'q'键，逆时针旋转
                    cube.rotation.y -= rotateSpeed;
                    console.log("逆时针旋转");
                    break;
                case 'e': // 'e'键，顺时针旋转
                    cube.rotation.y += rotateSpeed;
                    console.log("顺时针旋转");
                    break;
                case 'z': // ‘z’,向后旋转
                    cube.rotation.x -= rotateSpeed;
                    console.log("向后旋转");
                    break;
                case 'c': // ‘c’,向前旋转
                    cube.rotation.x += rotateSpeed;
                    console.log("向前旋转");
                    break;
            }
        }
    });

    // 渲染
    const animate = function () {
        requestAnimationFrame(animate);
        // 渲染场景
        renderer.render(scene, camera);
    };

    animate();
}
