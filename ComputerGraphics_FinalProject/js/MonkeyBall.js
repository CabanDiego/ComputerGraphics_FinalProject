import * as THREE from '../modules/three.module.js';
import { setupLoadingScreen } from './LoadingScreen.js';
import { setupGameOverScreen } from './GameOverScreen.js';
import { setupWinScreen } from './WinScreen.js';



let physicsWorld, scene, camera, renderer, clock, rigidBodies = [], tmpTrans;
const cameraPosition = new THREE.Vector3(0, 10, 20);

let keys = { left:false, right:false, up:false, down:false };
let isGameOver = false;
let obstacles = [];
let finishLine;

window.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'ArrowUp') keys.up = true;
    if (e.key === 'ArrowDown') keys.down = true;
});

window.addEventListener('keyup', (e)=>{
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'ArrowUp') keys.up = false;
    if (e.key === 'ArrowDown') keys.down = false;
});


const showStartScreen = setupLoadingScreen(() => {
    start(); 
});

const gameOverScreen = setupGameOverScreen(() => {
    gameOverScreen.hide();
    resetGame();
});

const winScreen = setupWinScreen(() => {
    winScreen.hide();
});


Ammo().then(() => {
    tmpTrans = new Ammo.btTransform();
    
    setTimeout(() => {
        showStartScreen(); 
    }, 1000);
});

function start() 
{
    setupPhysicsWorld();
    setupGraphics();
    createBlock();
    createBall();
    renderFrame();
}


function setupPhysicsWorld() 
{
    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld = new Ammo.btDiscreteDynamicsWorld(
        dispatcher,
        overlappingPairCache,
        solver,
        collisionConfiguration
    );
    physicsWorld.setGravity(new Ammo.btVector3(0, -100, 0));
}

function setupGraphics() 
{
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    
    const skyboxCubemap = new THREE.CubeTextureLoader().load([
    'images/skybox/px.png', 
    'images/skybox/nx.png', 
    'images/skybox/py.png', 
    'images/skybox/ny.png', 
    'images/skybox/pz.png', 
    'images/skybox/nz.png'
    ])

    scene.background = skyboxCubemap;


    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.2,
        5000
    );
    camera.position.set(0, 30, 70);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.1);
    hemiLight.color.setHSL(0.6, 0.6, 0.6);
    hemiLight.groundColor.setHSL(0.1, 1, 0.4);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    let dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(-1, 1.75, 1);
    dirLight.position.multiplyScalar(100);
    scene.add(dirLight);

    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    let d = 50;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.far = 13500;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0xbfd1e5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    renderer.shadowMap.enabled = true;
}

function renderFrame() {
    let deltaTime = clock.getDelta();
    updateBlockTilt(deltaTime);
    updatePhysics(deltaTime);

    //Make camera follow the ball
    if (rigidBodies.length > 0) {
        const ball = rigidBodies[0]; 
        const ballPos = ball.position.clone();

        //Camera offset behind and above the ball
        const cameraOffset = new THREE.Vector3(0, 30, 50);

        //Camera position
        const desiredPos = ballPos.clone().add(cameraOffset);

        //Smoothly move camera n
        camera.position.lerp(desiredPos, 0.1); 

        //Look slightly ahead of the ball
        const lookAtPos = ballPos.clone().add(new THREE.Vector3(0, 5, 0));
        camera.lookAt(lookAtPos);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(renderFrame);
    checkBallOffMap();
}


function createBlock() {
    let pos = {x:0, y:0, z:0};
    let scale = {x:60, y:2, z:700}; // extended platform
    let quat = {x:0, y:0, z:0, w:1};
    let mass = 0;

    // Three.js mesh
    let blockPlane = new THREE.Mesh(
        new THREE.BoxGeometry(scale.x, scale.y, scale.z),
        new THREE.MeshPhongMaterial({color:0xa0afa4})
    );
    blockPlane.position.set(pos.x, pos.y, pos.z);
    blockPlane.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    blockPlane.castShadow = true;
    blockPlane.receiveShadow = true;
    scene.add(blockPlane);

    // platform uses compound shape to include obstacles
    let compoundShape = new Ammo.btCompoundShape();
    
    // platform collision box
    let platformShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x*0.5, scale.y*0.5, scale.z*0.5));
    platformShape.setMargin(0.05);
    let platformTransform = new Ammo.btTransform();
    platformTransform.setIdentity();
    compoundShape.addChildShape(platformTransform, platformShape);
    
    // obstacles positioned along the platform
    const obstacles3D = [];
    
    // tunnel 1 - cylinder tunnel
    const tunnel1Left = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 10, 8),
        new THREE.MeshPhongMaterial({ color: 0xff6600 })
    );
    tunnel1Left.position.set(-12, 5, -25);
    tunnel1Left.castShadow = true;
    tunnel1Left.receiveShadow = true;
    tunnel1Left.userData.originalColor = 0xff6600;
    blockPlane.add(tunnel1Left);
    obstacles.push(tunnel1Left);
    
    const tunnel1Right = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 10, 8),
        new THREE.MeshPhongMaterial({ color: 0xff6600 })
    );
    tunnel1Right.position.set(12, 5, -25);
    tunnel1Right.castShadow = true;
    tunnel1Right.receiveShadow = true;
    tunnel1Right.userData.originalColor = 0xff6600;
    blockPlane.add(tunnel1Right);
    obstacles.push(tunnel1Right);
    
    // tunnel roof
    const tunnel1Roof = new THREE.Mesh(
        new THREE.BoxGeometry(30, 1, 5),
        new THREE.MeshPhongMaterial({ color: 0xff6600 })
    );
    tunnel1Roof.position.set(0, 10, -25);
    tunnel1Roof.castShadow = true;
    tunnel1Roof.receiveShadow = true;
    blockPlane.add(tunnel1Roof);
    
    // spinning cone obstacles
    const cone1 = new THREE.Mesh(
        new THREE.ConeGeometry(3, 6, 8),
        new THREE.MeshPhongMaterial({ color: 0xcc00ff })
    );
    cone1.position.set(-8, 4, -45);
    cone1.castShadow = true;
    cone1.receiveShadow = true;
    cone1.userData.originalColor = 0xcc00ff;
    blockPlane.add(cone1);
    obstacles.push(cone1);
    
    const cone2 = new THREE.Mesh(
        new THREE.ConeGeometry(3, 6, 8),
        new THREE.MeshPhongMaterial({ color: 0xcc00ff })
    );
    cone2.position.set(8, 4, -50);
    cone2.castShadow = true;
    cone2.receiveShadow = true;
    cone2.userData.originalColor = 0xcc00ff;
    blockPlane.add(cone2);
    obstacles.push(cone2);
    
    // sphere obstacles
    const sphere1 = new THREE.Mesh(
        new THREE.SphereGeometry(3, 16, 16),
        new THREE.MeshPhongMaterial({ color: 0x00ff99 })
    );
    sphere1.position.set(0, 4, -55);
    sphere1.castShadow = true;
    sphere1.receiveShadow = true;
    sphere1.userData.originalColor = 0x00ff99;
    blockPlane.add(sphere1);
    obstacles.push(sphere1);
    
    // tunnel 2 - torus obstacles
    const torus1 = new THREE.Mesh(
        new THREE.TorusGeometry(4, 1.5, 16, 32),
        new THREE.MeshPhongMaterial({ color: 0x00ff99 })
    );
    torus1.rotation.x = Math.PI / 2;
    torus1.position.set(-12, 5, -75);
    torus1.castShadow = true;
    torus1.receiveShadow = true;
    torus1.userData.originalColor = 0x00ff99;
    blockPlane.add(torus1);
    obstacles.push(torus1);
    
    const torus2 = new THREE.Mesh(
        new THREE.TorusGeometry(4, 1.5, 16, 32),
        new THREE.MeshPhongMaterial({ color: 0x00ff99 })
    );
    torus2.rotation.x = Math.PI / 2;
    torus2.position.set(12, 5, -75);
    torus2.castShadow = true;
    torus2.receiveShadow = true;
    torus2.userData.originalColor = 0x00ff99;
    blockPlane.add(torus2);
    obstacles.push(torus2);
    
    // dodecahedron obstacles (cool 12-sided shapes)
    const dodeca1 = new THREE.Mesh(
        new THREE.DodecahedronGeometry(3),
        new THREE.MeshPhongMaterial({ color: 0xffcc00 })
    );
    dodeca1.position.set(-8, 4, -100);
    dodeca1.castShadow = true;
    dodeca1.receiveShadow = true;
    dodeca1.userData.originalColor = 0xffcc00;
    blockPlane.add(dodeca1);
    obstacles.push(dodeca1);
    
    const dodeca2 = new THREE.Mesh(
        new THREE.DodecahedronGeometry(3),
        new THREE.MeshPhongMaterial({ color: 0xffcc00 })
    );
    dodeca2.position.set(8, 4, -105);
    dodeca2.castShadow = true;
    dodeca2.receiveShadow = true;
    dodeca2.userData.originalColor = 0xffcc00;
    blockPlane.add(dodeca2);
    obstacles.push(dodeca2);
    
    // octahedron (8-sided gem shapes)
    const octa1 = new THREE.Mesh(
        new THREE.OctahedronGeometry(4),
        new THREE.MeshPhongMaterial({ color: 0xff00ff })
    );
    octa1.position.set(0, 5, -125);
    octa1.castShadow = true;
    octa1.receiveShadow = true;
    octa1.userData.originalColor = 0xff00ff;
    blockPlane.add(octa1);
    obstacles.push(octa1);
    
    // tunnel 3 - cylinder pillars
    const pillar1 = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5, 2.5, 12, 8),
        new THREE.MeshPhongMaterial({ color: 0xff0099 })
    );
    pillar1.position.set(-10, 6, -155);
    pillar1.castShadow = true;
    pillar1.receiveShadow = true;
    pillar1.userData.originalColor = 0xff0099;
    blockPlane.add(pillar1);
    obstacles.push(pillar1);
    
    const pillar2 = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5, 2.5, 12, 8),
        new THREE.MeshPhongMaterial({ color: 0xff0099 })
    );
    pillar2.position.set(10, 6, -155);
    pillar2.castShadow = true;
    pillar2.receiveShadow = true;
    pillar2.userData.originalColor = 0xff0099;
    blockPlane.add(pillar2);
    obstacles.push(pillar2);
    
    // tunnel 3 roof
    const tunnel3Roof = new THREE.Mesh(
        new THREE.BoxGeometry(26, 1, 5),
        new THREE.MeshPhongMaterial({ color: 0xff0099 })
    );
    tunnel3Roof.position.set(0, 12, -155);
    tunnel3Roof.castShadow = true;
    tunnel3Roof.receiveShadow = true;
    blockPlane.add(tunnel3Roof);
    
    // icosahedron obstacles before finish (20-sided)
    const icosa1 = new THREE.Mesh(
        new THREE.IcosahedronGeometry(3),
        new THREE.MeshPhongMaterial({ color: 0x00ffff })
    );
    icosa1.position.set(-6, 4, -180);
    icosa1.castShadow = true;
    icosa1.receiveShadow = true;
    icosa1.userData.originalColor = 0x00ffff;
    blockPlane.add(icosa1);
    obstacles.push(icosa1);
    
    const icosa2 = new THREE.Mesh(
        new THREE.IcosahedronGeometry(3),
        new THREE.MeshPhongMaterial({ color: 0x00ffff })
    );
    icosa2.position.set(6, 4, -185);
    icosa2.castShadow = true;
    icosa2.receiveShadow = true;
    icosa2.userData.originalColor = 0x00ffff;
    blockPlane.add(icosa2);
    obstacles.push(icosa2);
    
    // now add physics for all obstacles
    const obstaclePhysicsData = [
        // cylinders as boxes for physics
        { x: -12, y: 5, z: -25, w: 4, h: 10, d: 4 },
        { x: 12, y: 5, z: -25, w: 4, h: 10, d: 4 },
        { x: 0, y: 10, z: -25, w: 30, h: 1, d: 5 },
        // cones as boxes
        { x: -8, y: 4, z: -45, w: 6, h: 6, d: 6 },
        { x: 8, y: 4, z: -50, w: 6, h: 6, d: 6 },
        // sphere
        { x: 0, y: 4, z: -55, w: 6, h: 6, d: 6 },
        // torus
        { x: -12, y: 5, z: -75, w: 8, h: 3, d: 8 },
        { x: 12, y: 5, z: -75, w: 8, h: 3, d: 8 },
        // dodecahedrons
        { x: -8, y: 4, z: -100, w: 6, h: 6, d: 6 },
        { x: 8, y: 4, z: -105, w: 6, h: 6, d: 6 },
        // octahedron
        { x: 0, y: 5, z: -125, w: 8, h: 8, d: 8 },
        // pillars
        { x: -10, y: 6, z: -155, w: 5, h: 12, d: 5 },
        { x: 10, y: 6, z: -155, w: 5, h: 12, d: 5 },
        { x: 0, y: 12, z: -155, w: 26, h: 1, d: 5 },
        // icosahedrons
        { x: -6, y: 4, z: -180, w: 6, h: 6, d: 6 },
        { x: 6, y: 4, z: -185, w: 6, h: 6, d: 6 }
    ];
    
    obstaclePhysicsData.forEach(obs => {
        let obstacleShape = new Ammo.btBoxShape(new Ammo.btVector3(obs.w*0.5, obs.h*0.5, obs.d*0.5));
        obstacleShape.setMargin(0.05);
        let obstacleTransform = new Ammo.btTransform();
        obstacleTransform.setIdentity();
        obstacleTransform.setOrigin(new Ammo.btVector3(obs.x, obs.y, obs.z));
        compoundShape.addChildShape(obstacleTransform, obstacleShape);
    });
    
    // create finish line at the end
    let finishMesh = new THREE.Mesh(
        new THREE.BoxGeometry(30, 0.5, 5),
        new THREE.MeshPhongMaterial({ 
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.3
        })
    );
    finishMesh.position.set(0, 2, -250)
    finishMesh.userData.originalColor = 0xffff00;
    blockPlane.add(finishMesh);
    finishLine = finishMesh;

    // physics body for platform+obstacles
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    let motionState = new Ammo.btDefaultMotionState(transform);

    let localInertia = new Ammo.btVector3(0,0,0);
    compoundShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, compoundShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    physicsWorld.addRigidBody(body);

    body.setCollisionFlags(body.getCollisionFlags() | 2); 
    body.setActivationState(4); 

    //Reduce bounciness and increase friction so the ball doesn't gain energy
    //Use a higher friction and a low restitution (0 = no bounce)
    body.setFriction(1.0);
    body.setRestitution(0.05);


    window.blockMesh = blockPlane;
    window.blockBody = body;
}


function createBall()
{
    let pos = {x: 0, y: 20, z: 0};
    let radius = 2;
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 2.0;

    const loader = new THREE.TextureLoader();
    const ballTexture = loader.load('images/ballTexture.jpg');

    //threeJS Section
    let ball = new THREE.Mesh(new THREE.SphereGeometry(radius), new THREE.MeshPhongMaterial({ map: ballTexture }));

    ball.position.set(pos.x, pos.y, pos.z);
    
    ball.castShadow = true;
    ball.receiveShadow = true;

    scene.add(ball);


    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );

    let colShape = new Ammo.btSphereShape( radius );
    colShape.setMargin( 0.05 );

    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );

    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );

    physicsWorld.addRigidBody( body );
    
    ball.userData.physicsBody = body;
    rigidBodies.push(ball);

    body.setRestitution(0.2);
    body.setFriction(0.7);
    body.setDamping(0.05, 0.1);
    body.setRollingFriction(0.05);
    body.setCcdMotionThreshold(1);
    body.setCcdSweptSphereRadius(0.2 * radius);
    
}


function updatePhysics( deltaTime )
{
    physicsWorld.stepSimulation( deltaTime, 10 );

    for ( let i = 0; i < rigidBodies.length; i++ ) 
    {
        let objThree = rigidBodies[ i ];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if ( ms ) 
        {
            ms.getWorldTransform( tmpTrans );
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
        }
    }
    
    checkCollisions();
}

// visual effect when ball hits obstacles
function checkCollisions() {
    if (rigidBodies.length === 0) return;
    
    const ball = rigidBodies[0];
    const ballPos = ball.position;
    const collisionDistance = 5;
    
    // check obstacle collisions
    obstacles.forEach(obstacle => {
        const obstacleWorldPos = new THREE.Vector3();
        obstacle.getWorldPosition(obstacleWorldPos);
        const distance = ballPos.distanceTo(obstacleWorldPos);
        
        // flash white+yellow when ball is close
        if (distance < collisionDistance) {
            obstacle.material.emissive.setHex(0xffff00);
            obstacle.material.color.setHex(0xffffff);
            
            setTimeout(() => {
                obstacle.material.emissive.setHex(0x000000);
                obstacle.material.color.setHex(obstacle.userData.originalColor);
            }, 300);
        }
    });
    
    // check if ball reached finish line
    if (finishLine && !isGameOver) {
        const finishWorldPos = new THREE.Vector3();
        finishLine.getWorldPosition(finishWorldPos);
        const distanceToFinish = ballPos.distanceTo(finishWorldPos);
        
        if (distanceToFinish < 8) {
            // player wins!
            finishLine.material.emissiveIntensity = 1.0;
            winScreen.show();
            stopBallPhysics(ball);
        }
    }
}


function updateBlockTilt(dt) {
    if (!window.blockMesh || !window.blockBody) return;

    const tiltSpeed = 2.0;
    const returnSpeed = 2.5;
    const maxTilt = Math.PI / 10; 

    let targetX = 0;
    let targetZ = 0;

    if (keys.up)    targetX -= maxTilt;
    if (keys.down)  targetX += maxTilt;
    if (keys.left)  targetZ += maxTilt;
    if (keys.right) targetZ -= maxTilt;

    let speedX = (keys.up || keys.down) ? tiltSpeed : returnSpeed;
    let speedZ = (keys.left || keys.right) ? tiltSpeed : returnSpeed;

    let tX = Math.min(1, speedX * dt);
    let tZ = Math.min(1, speedZ * dt);

    blockMesh.rotation.x = THREE.MathUtils.lerp(blockMesh.rotation.x, targetX, tX);
    blockMesh.rotation.z = THREE.MathUtils.lerp(blockMesh.rotation.z, targetZ, tZ);

    blockMesh.rotation.x = THREE.MathUtils.clamp(blockMesh.rotation.x, -maxTilt, maxTilt);
    blockMesh.rotation.z = THREE.MathUtils.clamp(blockMesh.rotation.z, -maxTilt, maxTilt);

    try {
        window.blockBody.activate();
    } catch (err) {
    }

    let transform = new Ammo.btTransform();
    transform.setIdentity();

    transform.setOrigin(new Ammo.btVector3(
        blockMesh.position.x,
        blockMesh.position.y,
        blockMesh.position.z
    ));

    // Convert Three.js quaternion → Ammo quaternion
    let q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(blockMesh.rotation.x, blockMesh.rotation.y, blockMesh.rotation.z, 'XYZ'));
    transform.setRotation(new Ammo.btQuaternion(q.x, q.y, q.z, q.w));

    blockBody.getMotionState().setWorldTransform(transform);
}

function checkBallOffMap() {
    if (rigidBodies.length === 0 || isGameOver) 
        return;

    const ball = rigidBodies[0];
    //Threshold for ball
    if (ball.position.y < -50) 
    { 
        isGameOver = true;
        gameOverScreen.show();
        stopBallPhysics(ball);
    }
}

//Freeze ball when it is out of bounds
function stopBallPhysics(ball) 
{
    const body = ball.userData.physicsBody;
    body.setActivationState(4); 
    body.setLinearVelocity(new Ammo.btVector3(0,0,0));
    body.setAngularVelocity(new Ammo.btVector3(0,0,0));
}

function resetGame() {
    isGameOver = false;
    //Remove old ball
    if (rigidBodies.length > 0) 
    {
        const oldBall = rigidBodies.pop();
        scene.remove(oldBall);
        physicsWorld.removeRigidBody(oldBall.userData.physicsBody);
    }
    
    //Reset block position
    if (window.blockMesh) 
    {
        window.blockMesh.rotation.set(0,0,0);
    }

    // reset obstacles back to orange
    obstacles.forEach(obstacle => {
        obstacle.material.color.setHex(obstacle.userData.originalColor);
    });

    //Create a new ball
    createBall();
}

