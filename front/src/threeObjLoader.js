import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';  // 旋转控制器

export class ThreeScene{
    constructor(container,modelPath,mtlPath){
        this.container=container;
        this.modelPath=modelPath;
        this.mtlPath=mtlPath;
        this.renderer=new THREE.WebGLRenderer();
        this.container.appendChild(this.renderer.domElement);
        this.scene=new THREE.Scene();
        this.camera=new THREE.PerspectiveCamera(45,container.clientWidth/container.clientHeight,0.1,100);
        this.camera.position.set(10,0,10);
        this.light=new THREE.HemisphereLight(0xFFFFFF,0x333333,1);
        this.controls=new OrbitControls(this.camera,this.renderer.domElement);
        this.scene.add(this.light);
        this.objloader=new OBJLoader();
        this.mtlloader=new MTLLoader();
        this.init();
    }
    init(){
        this.controls.update();
        this.loadModel();
        this.handleResize();  // 初始化时调整大小
        window.addEventListener('resize',this.handleResize.bind(this));  // 窗口大小改变时调整大小
        this.render();
    }
    loadModel() {
        // 加载 MTL 材质
        this.mtlloader.load(this.mtlPath, (materials) => {
            materials.preload(); // 预加载材质
            console.log('Materials loaded:', materials);

            // 使用 OBJLoader 加载 OBJ 模型
            this.objloader.setMaterials(materials); // 将材质设置给 OBJLoader
            this.objloader.load(
                this.modelPath,
                (group) => {
                    console.log('Model loaded:', group);
                    this.scene.add(group);
                    console.log("add group");
                },
                (event) => {
                    console.log(Math.floor((event.loaded * 100) / event.total) + '% loaded');
                },
                (error) => {
                    console.error('Error loading model:', error);
                }
                );
        }, (error) => {
            console.error('Error loading materials:', error); // 处理材质加载错误
            console.log("error");
        });
    }
    handleResize(){
        const width=this.container.clientWidth;
        const height=this.container.clientHeight;
        this.camera.aspect=width/height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width,height,false);
    }
    render(){
        this.renderer.render(this.scene,this.camera);
        requestAnimationFrame(this.render.bind(this));
    }
    cleanup(){
        window.removeEventListener('resize',this.handleResize.bind(this));
    }
}




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
