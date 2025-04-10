import * as THREE from "./build/three.module.js";
import { EffectComposer } from "./jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./jsm/postprocessing/RenderPass.js";
import { OutlinePass } from "./jsm/postprocessing/OutlinePass.js";
import { UnrealBloomPass } from "./jsm/postprocessing/UnrealBloomPass.js";
import { FBXLoader } from './jsm/loaders/FBXLoader.js'
 
let canvas = document.querySelector("#myCanvas");
 
// Create loading manager
var manager = new THREE.LoadingManager();
manager.onLoad = function() {
    document.getElementById("loadingScreen").style.display = "none";
};
 
// Create renderer and scene
let renderer = new THREE.WebGLRenderer({canvas});
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
let scene = new THREE.Scene();
 
// global variables
let WIDTH = canvas.offsetWidth;
let HEIGHT = canvas.offsetHeight;
let OBJECTS = [];
let tetrahedrons = [];
const labelContainerElem = document.querySelector("#labels");
 
let camera = new THREE.OrthographicCamera( WIDTH / - 2, WIDTH / 2, HEIGHT / 2, HEIGHT / - 2, 1, 1000 );
camera.position.set(0.0, 0.0, 500);
 
// Post processing
var renderScene = new RenderPass( scene, camera );
var bloomPass = new UnrealBloomPass( new THREE.Vector2( WIDTH, HEIGHT ), 1.5, 0.4, 0.85 ); //1.0, 9, 0.5, 512);
bloomPass.renderToScreen = true;
bloomPass.threshold = 0.7;
bloomPass.strength = 1;
bloomPass.radius = 0.4;
 
let composer = new EffectComposer( renderer );
let params = {
    edgeStrength: 2.3,
    edgeGlow: 1,
    edgeThickness: 5.0
};
 
let outlinePass = new OutlinePass(new THREE.Vector2(WIDTH, HEIGHT), scene, camera);
outlinePass.edgeStrength = params.edgeStrength;
outlinePass.edgeGlow = params.edgeGlow;
outlinePass.edgeThickness = params.edgeThickness;
outlinePass.visibleEdgeColor.set(0xffffff);
outlinePass.hiddenEdgeColor.set(0x190A05);
 
composer.setSize( WIDTH, HEIGHT );
composer.addPass( renderScene );
composer.addPass( bloomPass );
composer.addPass( outlinePass );

let sceneScale = new THREE.Object3D();
sceneScale.visible = true;
scene.add(sceneScale);
 
let outlinePassObjects = [];
 
class Planet {
    constructor(x, y, z, r, textureSrc) {
        let texture = new THREE.TextureLoader().load(textureSrc);
        this.material = new THREE.MeshBasicMaterial({map: texture, reflectivity: 1.0});
        this.geometry = new THREE.SphereGeometry(r, 64, 64);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(x, y, z);
        sceneScale.add(this.mesh);
        outlinePassObjects.push(this.mesh);
        OBJECTS.push(this.mesh);
 
        let material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, map: new THREE.TextureLoader().load("./assets/particle.png"), blending: THREE.AdditiveBlending, transparent: true});
        let geometry = new THREE.SphereGeometry(r + 4, 64, 64);
        let mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI/1.5;
        mesh.rotation.z = -Math.PI/4;
        mesh.position.set(x, y, z);
        //sceneScale.add(mesh);
 
        this.rotateSpeed = 0.03;
        this.r = r;
 
        this.animating = false;
        this.animationStartTime = 0;
        this.animationDuration = 1000;
 
        this.animationXrotation = 0;
        this.animationYrotation = 0;
    }
 
    resetRotation() {
        this.animating = true;
        this.animationStartTime = millis();
        this.animationXrotation = this.mesh.rotation.x;
        this.animationYrotation = this.mesh.rotation.y;
    }
    
    rotateForward(xDist, yDist) {
        this.mesh.rotation.y += xDist;
        this.mesh.rotation.x += yDist;
    }
        
    rotateBackward(dist) {
        this.mesh.rotation.y -= dist;
    }
 
    update() {
        if(this.animating) {
            let timePassed = millis() - this.animationStartTime;
            let xRotation = map(timePassed, 0, this.animationDuration, this.animationXrotation, 0);
            let yRotation = map(timePassed, 0, this.animationDuration, this.animationYrotation, 0);
            this.mesh.rotation.x = xRotation;
            this.mesh.rotation.y = yRotation;
 
            if(millis() > this.animationStartTime + this.animationDuration) {
                this.animating = false;
            }
        }
    }
}
 
class Light {
    constructor(x, y, r, ctx) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.ctx = ctx;
        this.on = false;
        this.flickerTime = 1000 + Math.round(Math.random() * 5000);
        this.flickerTimer = millis();
 
        this.onTimer = millis();
    }
 
    show() {
        if(millis() > this.flickerTimer + this.flickerTime) {
            this.flickerTimer = millis();
            this.flickerTime = 1000 + Math.round(Math.random() * 5000);
            this.on = true;
            this.onTimer = millis();
        }
 
        if(this.on) {
            this.ctx.fillStyle = "white";
            this.ctx.beginPath();
            this.ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
            this.ctx.fill();
 
            if(millis() > this.onTimer + 500) {
                this.on = false;
            }
        }
    }
}
 
class ISSCanvas {
    constructor(x, y, z) {
        this.ctx = document.createElement("canvas").getContext("2d");
        this.ctx.canvas.width = 896;
        this.ctx.canvas.height = 357;
 
        let self = this;
        let background = new Image();
        this.image = background;
 
        this.texture = new THREE.CanvasTexture(this.ctx.canvas);
        background.onload = function() {
    
            self.ctx.drawImage(background, 0, 0);
            self.texture.needsUpdate = true;
    
            //texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    
            let material = new THREE.MeshBasicMaterial({ map: self.texture });
            let geometry = new THREE.PlaneGeometry(150, 60, 0);
    
            let mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, y, z);
            sceneScale.add(mesh);
            self.setMesh(mesh);
        }
        background.src = "./assets/issV2.jpg";
 
        this.lights = [
            new Light(450, 175, 12, this.ctx),
            new Light(250, 100, 8, this.ctx),
            new Light(800, 200, 9, this.ctx)
        ];
    }
 
    setMesh(mesh) {
        this.mesh = mesh;
    }
 
    setTexture(texture) {
        this.texture = texture;
    }
 
    showLights() {
        this.ctx.drawImage(this.image, 0, 0);
        for(let light of this.lights) {
            light.show();
        }
        this.texture.needsUpdate = true;
    }
}
 
class ISS {
    constructor(parent, rotationAxis) {
        let texture = new THREE.TextureLoader().load("./assets/issV2.png");
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
 
        let material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        let geometry = new THREE.PlaneGeometry(130, 104, 0);
 
        this.mesh = new THREE.Mesh(geometry, material);
        sceneScale.add(this.mesh);
 
        this.minOrbitSpeed = 0.003;
        this.maxOrbitSpeed = 0.013;

        this.parent = parent;
        this.orbitAngle = 0;
        this.orbitSpeed = 0.013;
        this.orbitDist = 300;

        this.selected = false;
    }

    slowOrbit() {
        this.orbitSpeed = this.minOrbitSpeed;
        this.selected = true;
    }

    speedOrbit() {
        this.orbitSpeed = this.maxOrbitSpeed;
        this.selected = false;
    }
 
    orbit() {
        let r = this.orbitDist;
        let horz = 0;
        let x = r * Math.sin(this.orbitAngle) * Math.cos(horz);
        let y = r * Math.sin(this.orbitAngle) * Math.sin(horz);
        let z = r * Math.cos(this.orbitAngle);
 
        this.orbitAngle += this.orbitSpeed;
 
        this.mesh.position.set(this.parent.position.x + x, this.parent.position.y + y, this.parent.position.z + z);
    }
}
 
class Rocket {
    constructor(x, y, z) {
        let texture = new THREE.TextureLoader().load("./assets/rocket.png");
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
 
        let material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, emissive: 0x000000, emissiveIntensity: 0 });
        let geometry = new THREE.PlaneGeometry(17, 100, 0);
 
        this.mesh = new THREE.Object3D();
        this.mesh.position.set(x, y, z);
        this.mesh.rotation.z = -Math.PI/2;
        sceneScale.add(this.mesh);

        let self = this;
        let loader2 = new FBXLoader(manager);
        loader2.load("./assets/rocket.fbx", function(object) {
            let rocketMesh = object.children[0];
            for(let mesh of rocketMesh.children) {
                if(mesh.name == "Cylinder016") {
                    mesh.rotation.set(0, 0, 0);
                }
            }
            console.log(rocketMesh);
            rocketMesh.position.y = -52;
            rocketMesh.scale.set(4, 4, 24.184);
            console.log(object);
            self.mesh.add(rocketMesh);
            self.rocketMesh = rocketMesh;
        })
 
        let loader = new FBXLoader();
        loader.load("./assets/exhaust.fbx", function(object) {
            let exhaustMesh = object;
            let flameMaterial = new THREE.MeshLambertMaterial ({ color: 0xC2261F, transparent: true, opacity: 1, reflectivity: 1.0, emissive: 0xC2261F, emissiveIntensity: 4 });
            exhaustMesh.children[0].material = flameMaterial;
 
            exhaustMesh.scale.set(0.05, 0.04, 0.05);
            exhaustMesh.position.set(0, -70, 0);
            exhaustMesh.rotateZ(Math.PI/2);
 
            self.exhaust = exhaustMesh;
            self.mesh.add(exhaustMesh);
        })
 
        let flameGeometry = new THREE.BoxGeometry(60, 10, 5);
        let flameMaterial = new THREE.MeshPhongMaterial({ color: 0xC2261F, reflectivity: 1.0, emissive: 0xC2261F });
        let flameMesh = new THREE.Mesh(flameGeometry, flameMaterial);
        flameMesh.position.set(x - 50, y, z);
 
        this.accelerate = true;
        this.exhaustAccTime = random(900, 1500);
        this.exhaustAccTimer = millis();
 
        this.burn = false;
        this.exhaustBurnTime = random(2000, 4000);
        this.exhaustBurnTimer = millis();
        
        this.deccelerate = false;
        this.exhaustDeccTime = random(900, 1500);
        this.exhaustDeccTimer = millis();
 
        this.drift = false;
        this.exhaustDriftTime = random(2100, 4500);
        this.exhaustDriftTimer = millis();
        //scene.add(flameMesh);
 
        this.startPosition = x;
        this.endPosition = x + 600;
        this.movementSpeed = 0.2;

        this.rotate = false;
    }
 
    update() {
        if(this.movementSpeed < 0) {
            let dist = Math.abs(this.mesh.position.x - this.startPosition);
            if(dist < 100 && !this.rotate) {
                this.rotate = true;
            }
        }
        if(this.rotate) {
            this.mesh.rotation.y -= 0.006;
            if(this.mesh.rotation.y < -Math.PI) {
                this.mesh.rotation.y = Math.PI;
                this.rotate = false;
            }
        }

        if(this.rocketMesh) {
            //this.rocketMesh.rotation.z += 0.01;
        }
        // Only start updating once exhaust mesh has been loaded
        if(this.exhaust) {
            this.animate();
 
            this.mesh.position.x += this.movementSpeed;
            if(this.mesh.position.x > this.endPosition || this.mesh.position.x < this.startPosition) {
                this.movementSpeed = -this.movementSpeed;
                if(this.mesh.position.x > this.endPosition) {
                    this.mesh.rotateZ(Math.PI);
                }
            }
        }
    }
 
    animate() {
        if(this.accelerate) {
            let diff = (this.exhaustAccTimer + this.exhaustAccTime) - millis();
            let opacity = map(diff, 0, this.exhaustAccTime, 1, 0);
 
            this.exhaust.children[0].material.opacity = opacity;
 
            if(millis() > this.exhaustAccTimer + this.exhaustAccTime) {
                this.accelerate = false;
                this.burn = true;
 
                this.exhaustBurnTime = random(2000, 4000);
                this.exhaustBurnTimer = millis();
            }
        }
 
        if(this.burn) {
            this.exhaust.children[0].material.opacity = 1;
 
            if(millis() > this.exhaustBurnTimer + this.exhaustBurnTime) {
                this.burn = false;
                this.deccelerate = true;
 
                this.exhaustDeccTime = random(2100, 4500);
                this.exhaustDeccTimer = millis();
            }
        }
 
        if(this.deccelerate) {
            let diff = (this.exhaustDeccTimer + this.exhaustDeccTime) - millis();
            let opacity = map(diff, 0, this.exhaustDeccTime, 0, 1);
 
            this.exhaust.children[0].material.opacity = opacity;
 
            if(millis() > this.exhaustDeccTimer + this.exhaustDeccTime) {
                this.deccelerate = false;
                this.drift = true;
 
                this.exhaustDriftTime = random(700, 1500);
                this.exhaustDriftTimer = millis();
            }
        }
 
        if(this.drift) {
            this.exhaust.children[0].material.opacity = 0;
 
            if(millis() > this.exhaustDriftTimer + this.exhaustDriftTime) {
                this.drift = false;
                this.accelerate = true;
 
                this.exhaustAccTime = random(900, 1500);
                this.exhaustAccTimer = millis();
            }
        }
    }
}
 
class Moon {
    constructor(parent, rotationAxis) {
        let texture = new THREE.TextureLoader().load("./assets/moon.jpg");
        this.material = new THREE.MeshBasicMaterial({map: texture});
        this.geometry = new THREE.SphereGeometry(40, 64, 64);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        sceneScale.add(this.mesh);
        OBJECTS.push(this.mesh);
 
        this.parent = parent;
 
        this.rotationAxis = rotationAxis;
        this.r = 40;
 
        let orbitDist = 350;
        let startX = parent.position.x + -rotationAxis.x * orbitDist;
        let startY = parent.position.y + rotationAxis.y * orbitDist;
        let startZ = parent.position.z + rotationAxis.z * orbitDist;
 
        this.rotatePosition = new THREE.Vector3(startX, startY, startZ);
        this.mesh.position.set(startX, startY, startZ);
        this.orbitDist = orbitDist;
        
        this.rotateSpeed = 0.01;
        this.orbitAngle = 0;
        this.orbitSpeed = 0.005;
        //this.orbitDist = 400;
 
        this.orbitY = 200;
        this.lastOrbitPI = 0;
        this.orbitYDir = -1;
 
        this.xDir = false;
        this.rotateAngle = 0;
    }
 
    orbit2() {
        let r = this.orbitDist;
        let horz = Math.PI/4;
        let x = r * Math.sin(this.orbitAngle) * Math.cos(horz);
        let y = r * Math.sin(this.orbitAngle) * Math.sin(horz);
        let z = r * Math.cos(this.orbitAngle);
 
        this.orbitAngle += this.orbitSpeed;
 
        this.mesh.position.set(this.parent.position.x + x, this.parent.position.y + y, this.parent.position.z + z);
        this.mesh.rotateOnAxis(this.rotationAxis.normalize(), 0.005);
    }
 
    orbit() {
        this.orbitAngle += this.orbitSpeed;
        let p = new THREE.Vector3(this.orbitDist * Math.cos(this.orbitAngle), 0, this.orbitDist * Math.sin(this.orbitAngle));
 
        if(this.orbitAngle - this.lastOrbitPI > Math.PI) {
            this.orbitYDir = -this.orbitYDir;
            this.lastOrbitPI = this.orbitAngle;
        }
        let y = map(this.orbitAngle, this.lastOrbitPI, this.lastOrbitPI + Math.PI, -this.orbitYDir * this.orbitY, this.orbitYDir * this.orbitY);
 
        this.mesh.position.set(this.parent.mesh.position.x + p.x, this.parent.mesh.position.y + p.y + y, this.parent.mesh.position.z + p.z);
    }
}
 
const tempV = new THREE.Vector3();
 
 
class Popup {
    constructor(parent, text, followPopup, latitude, longitude, width, height, addToParent) {
        let boxWidth = width || 60;
        let boxheight = height || 60;
        let geometry = new THREE.BoxGeometry(boxWidth, boxheight, 5);
        //let material = new THREE.MeshBasicMaterial({color: 0xFFFFFF, reflectivity: 1.0, emissive: 0xFFFFFF});
        let material = new THREE.MeshBasicMaterial({color: 0x0000FF});
        this.mesh = new THREE.Mesh(geometry, material);
 
        this.parent = parent.mesh;
 
        let x = 0;
        let y = 0;
        let z = 0;
 
        if(latitude !== null && longitude !== null && !followPopup) {
            let rho = parent.r;
            let phi   = (90-latitude)*(Math.PI/180)
            let theta = (longitude+180)*(Math.PI/180)
 
            x = -((rho) * Math.sin(phi)*Math.cos(theta));
            z = ((rho) * Math.sin(phi)*Math.sin(theta));
            y = ((rho) * Math.cos(phi));
        }
 
        this.addToParent = true || addToParent;
        if(addToParent != undefined) {
            this.addToParent = addToParent;
        }
 
        if(followPopup) {
            if(parent instanceof Planet || parent instanceof Moon) {
                this.mesh.position.z = parent.r;
            }
 
            if(this.addToParent) {
                parent.mesh.add(this.mesh);
            } else {
                sceneScale.add(this.mesh);
            }
            //this.mesh.position.set(parent.mesh.position.x, parent.mesh.position.y, parent.mesh.position.z);
            OBJECTS.push(this.mesh);
        } else {
            parent.mesh.add(this.mesh);
            this.mesh.position.set(x, y, z);
            OBJECTS.push(this.mesh);
            this.mesh.lookAt(parent.mesh.position);
            
            let iconTexture = new THREE.TextureLoader().load("./assets/heatmap2.png");
            let iconGeometry = new THREE.PlaneGeometry(40, 40, 40);
            let iconMaterial = new THREE.MeshBasicMaterial({ map: iconTexture, transparent: true });
            let iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
            parent.mesh.add(iconMesh);
            iconMesh.position.set(x, y, z);
            var v = new THREE.Vector3();
            var target = new THREE.Vector3();
            iconMesh.getWorldPosition(target);
            v.subVectors(target, parent.mesh.position).add(target);
            iconMesh.lookAt(v);
        }
        this.mesh.visible = false;
 
        let elem = document.createElement("div");
        let p = document.createElement("p");
        p.innerHTML = text;
        let arrow = document.createElement("div");
        arrow.classList.add("arrow-down");
        
        elem.appendChild(p);
        elem.appendChild(arrow);
        
        labelContainerElem.appendChild(elem);
        this.label = elem;
        this.label.style.display = "none";
 
        this.selected = false;
    }
 
    update() {
        this.mesh.position.set(this.parent.position.x, this.parent.position.y, this.parent.position.z + 70);
    }
    
    showLabel() {
        if(this.label.style.display == "none") {
            this.label.style.display = "block";
        }
        
        this.mesh.updateWorldMatrix(true, false);
        this.mesh.getWorldPosition(tempV);
        
        tempV.project(camera);
        
        const x = (tempV.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (tempV.y * -0.5 + 0.5) * canvas.clientHeight;
        
        this.label.style.transform = `translate(-50%, -50%) translate(${x}px,${y - this.label.offsetHeight/2}px)`;
    }
 
    hideLabel() {
        if(this.label.style.display != "none") {
            this.label.style.display = "none";
        }
    }
}
 
function createBackgroundPlane() {
    let texture = new THREE.CanvasTexture(getCanvasTexture());
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    let material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    let geometry = new THREE.PlaneGeometry(21.4, 12, 0)
    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, -3);
    scene.add(mesh);
}
 
class StarBackground {
    constructor() {
        // Create canvas
        this.ctx = document.createElement("canvas").getContext("2d");
        this.ctx.canvas.width = 1920;
        this.ctx.canvas.height = 1080;
 
        let background = new Image();
        background.src = "./assets/myCanvas.jpg";
        this.image = background;
 
        this.ctx.drawImage(background, 0, 0);
 
        // Create mesh
        this.texture = new THREE.CanvasTexture(this.ctx.canvas);
        let material = new THREE.MeshBasicMaterial({ map: this.texture });
        let geometry = new THREE.PlaneGeometry(1920, 1080, 0);
 
        let mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 0, -500);
        scene.add(mesh);
 
        // Class variables
        this.starTime = millis();
        this.starTimer = Math.round(Math.random() * 1000);
        this.stars = [];
    }
 
    moveStars() {
        if(millis() > this.starTime + this.starTimer) {
            this.starTime = millis();
            this.starTimer = Math.round(Math.random() * 1000);
            
            let randX = Math.random() * this.ctx.canvas.width;
            let randY = Math.random() * this.ctx.canvas.height;
 
            this.stars.push(new Star(randX, randY, this.ctx));
        }
 
        this.ctx.drawImage(this.image, 0, 0);
 
        for(let i = this.stars.length - 1; i >= 0; i--) {
            this.stars[i].update();
            this.stars[i].show();
 
            if(this.stars[i].lifespan < 0) {
                this.stars.splice(i, 1);
            }
        }
 
        this.texture.needsUpdate = true;
    }
}
 
class Star {
    constructor(x, y, ctx) {
        this.x = x;
        this.y = y;
        this.vx = Math.random() * 3;
        this.vy = Math.random() * 3;
        this.r = 0.5 + Math.random() * 2;
        this.lifespan = 255;
        this.ctx = ctx;
    }
 
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
 
    show() {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${this.lifespan/255})`;
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
        this.ctx.fill();
        this.lifespan -= 2;
    }
}
 
let CLOCK = new THREE.Clock();
CLOCK.start();
 
let min = 921600;
let max = 2073600;
let current = WIDTH * HEIGHT;
 
let earth = new Planet(-600, 0, -3, 200, "assets/earth_clouds.png");
let mars = new Planet(600, 0, 0, 106, "assets/mars.jpg");
let moon = new Moon(earth.mesh, new THREE.Vector3(1, -1, 0));
//let iss = new ISSCanvas(earth.mesh.position.x + 300, 0, 0);
let iss = new ISS(earth.mesh, new THREE.Vector3(1, 0, 0));
let rocket = new Rocket(earth.mesh.position.x + 600, 0, 0);
outlinePass.selectedObjects = outlinePassObjects;
 
let popups = [];
for(let data of POPUP_DATA) {
    if(data.long && data.lat) {
        popups.push(new Popup(earth, data.popupHTML, false, data.lat, data.long));
    }
}
setTimeout(() => {
    popups.push(new Popup(iss, POPUP_DATA.find((popup) => popup.name == "iss").popupHTML, true, null, null, 120, 60));
}, 1000);
popups.push(new Popup(rocket, POPUP_DATA.find((popup) => popup.name == "rocket").popupHTML, true, null, null, 40, 110));
popups.push(new Popup(mars, POPUP_DATA.find((popup) => popup.name == "mars").popupHTML, true, null, null, 160, 160));
popups.push(new Popup(moon, POPUP_DATA.find((popup) => popup.name == "moon").popupHTML, true, null, null, 70, 70, false));
 
let background = new StarBackground();
//createBackgroundPlane();
//createGround();
 
let light = new THREE.SpotLight(0xffffff, 1);
light.position.set(-250, 0, 600);
scene.add(light);
 
function millis() {
    return Math.floor(CLOCK.getElapsedTime() * 1000);
}

let mouseX = 0;
let mouseY = 0;
 
let draw = function() {
    resizeRendererToDisplaySize();
 
    earth.update();
    rocket.update();
    iss.orbit();
    moon.orbit2();
    //rotateAboutPoint(moon.mesh, earth.mesh.position, new THREE.Vector3(-1, 1, 0), 0.01, true);
    //moon.orbit();
    background.moveStars();
    
    for(let t of tetrahedrons) {
        t.update();
    }
    for(let popup of popups) {
        if(!popup.addToParent) {
            popup.update();
        }
        if(popup.selected) {
            popup.showLabel();
        }
    }

    composer.render();
    requestAnimationFrame(draw);
}
draw();
 
document.onmousemove = function(e) {
    onDocumentMouseMove(e);
}
 
document.onclick = function(e) {
    onDocumentMouseClick(e);
}
 
document.addEventListener("mousedown", function(event){
    //mouseDownFunction(e); 
    // Only override onmousemove event if intersecting earth mesh on mouse down
    let canvasRect = canvas.getBoundingClientRect();
    let mouse3D = new THREE.Vector3(
        ((event.clientX - canvasRect.left) / WIDTH ) * 2 - 1,
        -((event.clientY - canvasRect.top) / HEIGHT ) * 2 + 1,
        0.5 
    );
    let raycaster = new THREE.Raycaster();
    
    raycaster.setFromCamera(mouse3D, camera);
    let intersects = raycaster.intersectObjects(OBJECTS);
 
    let intersectingEarthMesh = false;
    for(let intersect of intersects) {
        if(intersect.object == earth.mesh) {
            intersectingEarthMesh = true;
        }
    }
 
    if(intersectingEarthMesh) {
        document.onmousemove = function(e) {
            rotateEarth(e);
        }
    }
});
 
document.addEventListener("mouseup", function(e){
    lastMousePos = {
        x: null,
        y: null
    };
    
    document.body.style.cursor = "default";
 
    document.onmousemove = function(e) {
        onDocumentMouseMove(e);
    }
});
 
document.getElementById("heading").addEventListener("click", function(e) {
    console.log("WORKING");
    let popup = document.querySelector("#heading .popup");
    if(popup.style.display == "block") {
        popup.style.display = "none";
    } else {
        popup.style.display = "block";
    }
});
 
//document.addEventListener("mousemove", onDocumentMouseDown);
 
function onDocumentMouseClick(event) {
    let canvasRect = canvas.getBoundingClientRect();
    let mouse3D = new THREE.Vector3(
        ((event.clientX - canvasRect.left) / WIDTH ) * 2 - 1,
        -((event.clientY - canvasRect.top) / HEIGHT ) * 2 + 1,
        0.5 
    );
    let raycaster = new THREE.Raycaster();
    
    raycaster.setFromCamera(mouse3D, camera);
    let intersects = raycaster.intersectObjects(OBJECTS);
 
    for(let popup of popups) {
        if(intersects.length > 0 && intersects[0].object == popup.mesh) {
            popup.selected = true;
            if(popup.mesh.parent == iss.mesh) {
                iss.slowOrbit();
            }
        } else {
            popup.selected = false;
            popup.hideLabel();
            if(popup.mesh.parent == iss.mesh) {
                iss.speedOrbit();
            }
        }
    }
}
 
function onDocumentMouseMove(event) {
    let canvasRect = canvas.getBoundingClientRect();
    let mouse3D = new THREE.Vector3(
        ((event.clientX - canvasRect.left) / WIDTH ) * 2 - 1,
        -((event.clientY - canvasRect.top) / HEIGHT ) * 2 + 1,
        0.5 
    );

    mouseX = event.clientX;
    mouseY = event.clientX;

    let raycaster = new THREE.Raycaster();
    
    raycaster.setFromCamera(mouse3D, camera);
    let intersects = raycaster.intersectObjects(OBJECTS);
 
    let intersectedPopup = false;
    for(let popup of popups) {
        if(intersects.length > 0 && intersects[0].object == popup.mesh) {
            intersectedPopup = true;
        }
        // if(intersects.length > 0 && intersects[0].object == popup.mesh) {
        //     popup.selected = true;
        // } else {
        //     popup.selected = false;
        //     popup.hideLabel();
        // }
    }
 
    if(intersectedPopup) {
        document.body.style.cursor = "pointer";
    } else {
        document.body.style.cursor = "default";
    }
}
 
let lastMousePos = {
    x: null,
    y: null
};
 
function rotateEarth(event) {
    event.preventDefault();
    document.body.style.cursor = "move";
 
    let xDist = 0;
    let yDist = 0;
 
    if(lastMousePos.x != null) {
        xDist = event.clientX - lastMousePos.x;
        yDist = event.clientY - lastMousePos.y;
        xDist /= 200;
        yDist /= 200;
    }
 
    earth.rotateForward(xDist, yDist);
 
    lastMousePos.x = event.clientX;
    lastMousePos.y = event.clientY;
}

// Function that handles sizing of the canvas
function resizeRendererToDisplaySize() {
    canvas = renderer.domElement;
    //camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.left = canvas.clientWidth / - 2;
    camera.right = canvas.clientWidth / 2;
    camera.top = canvas.clientHeight / 2;
    camera.bottom = canvas.clientHeight / - 2;
    camera.updateProjectionMatrix();
    
    WIDTH = canvas.clientWidth;
    HEIGHT = canvas.clientHeight;
 
    let current = WIDTH * HEIGHT;
    let min = 702000;
    let max = 2073600;
    let minSize = 0.6;
    let maxSize = 1;
    let newScale = map(current, min, max, minSize, maxSize);
    sceneScale.scale.set(newScale, newScale, newScale);
    
    renderer.setSize(WIDTH, HEIGHT );
    composer.setSize(WIDTH, HEIGHT );
}
 
function addToScene(mesh, collide = false) {
    if(collide) {
        OBJECTS.push(mesh);
    }
    scene.add(mesh);
}
 
// Map number from one range to another
function map(num, in_min, in_max, out_min, out_max){
  return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
 
function random(min, max) { // min and max included 
  let rand = Math.random();
    if (min > max) {
      const tmp = min;
      min = max;
      max = tmp;
    }
 
    return rand * (max - min) + min;
}